/*
e.g. Transform:HTMLBody_type<Type>_Put
	a view:ModuleTransform, view:Transform, view:PutTransform ;
	view:module "magnode/transform.HTTPAuto_typeMongoDB_Put" ;
	view:domain type:Post ;
	view:range type:HTTPResponse .
*/

// Right now this only handles a POST request, or technically, POST and PUT identically
// But we should create a new transform type for each HTTP method

var util=require('util');

var jsonschema=require('jsonschema');
var rdf=require('rdf');
var rdfenv = rdf.environment;
var IRI = require('iri').IRI;
var ObjectId = require('mongodb').ObjectID;
var contenttype=require('contenttype');
var Uritpl = require('uri-templates');
var relns = rdf.ns('http://www.iana.org/assignments/relation/');

var render=require('./render');
var relativeuri=require('./relativeuri');
var escapeMongoObject = require('./mongoutils').escapeObject;

/* Parse the list of ETags in an ETag header, stripping quotes and Weak token */
function parseETag(header){
	return header.split(',').map(function(v){
		var match;
		match = v.trim().match(/^(W\/)?"(.*)"$/);
		if(!match) throw new Error('Invalid ETag');
		return match[2];
	});
}

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceType = db.getCollection(resourceTypesFirst)[0].toString();

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;

	var parsedData = resources[resourceType];
	var operations = [];
	var links=[];
	var types=[];
	var linkTemplates;
	var schema;
	var where;
	var collectionName, collection;

	//if(typeof fieldData._id!='string'){
	//	return void haveResponse(new Error('No _id field specified while using form submission'));
	//}

	var authResources = Object.create(resources);
	//authResources.access_token = resources.access_token;

	// Read the "profile" property off of the request.headers['content-type'] media-type
	// TODO probably remove this, this prohibits much useful functionality like rendering from one JSON Schema profile to another
	if(request.headers['content-type']){
		var contentType = contenttype.parseMedia(request.headers['content-type']);
		if(contentType.type=='application/json' && contentType.params.profile!=resourceType){
			return void callback(new Error('Provided Content-Type ('+request.headers['content-type']+') mismatches transform domain (<'+resourceType+'>)'));
		}
	}

	parseFormAuth();

	function parseFormAuth(){
		authz.test(authResources, ['put'], resources, function(authorized){if(authorized===true){
			resources['db-mongodb-schema'].findOne({id:resourceType}, haveSchema);
		}else{
			response.statusCode = 403;
			response.end("transform.HTTPAuto_typeMongoDB_Put: `put` <"+resources.resource+">: Denied\n");
			callback(null, {"http://magnode.org/HTTPResponse":403});
		}});
	}

	function haveSchema(err, typeDoc){
		if(err) return void haveResponse(err);
		else if(!typeDoc) return void haveResponse(new Error('No such schema <'+resourceType+'> found'));
		schema = typeDoc.schema || (typeDoc.properties&&typeDoc) || {};
		// Begin constructing a query to see if such a document already exists or not.
		// This will determine if to insert() or update() the document, which is necessary to correctly handle conditional request headers.

		// Scan for links
		linkTemplates = schema.links || [];
		// This URI-parsing behavior is tied to that in scan.MongoDBJSONSchema.js
		linkTemplates.forEach(function(v){
			var tpl = new Uritpl(v.href);
			// FIXME use the actual node URI as the subject
			var predicate = rdfenv.createNamedNode(new IRI(relns('')).resolveReference(v.rel).toString());
			var statement = new rdfenv.createTriple(rdfenv.createNamedNode(resources.variant.resource), predicate, rdfenv.createNamedNode(tpl.fillFromObject(parsedData)));
			links.push(statement);
		});

		// Verify that the resource is a valid instance
		try {
			var validator = new jsonschema.Validator;
			validator.attributes._schema = function(){};
			var result = validator.validate(parsedData, schema);
			if(!result.valid) throw new Error('Instance does not validate against schema:\n'+result.toString());
			// TODO use the hyper-schema to extract "type" link relations, instead of a hard-coded Array
			//types = types.concat(links.filter(function(v){ return v.predicate==relns('type'); }).map(function(v){ return v.object; }));
			types = links.filter(function(v){ return v.predicate.toString()===relns('type'); }).map(function(v){ return v.object.toString(); });
			if(types.length<1){
				throw new Error('Document has no type list');
			}
		}catch(err){
			response.statusCode = 400;
			response.write(err.stack||err.toString());
			response.end("\n");
			callback(null, {"http://magnode.org/HTTPResponse":400});
			return;
		}

		collectionName = schema.mongoCollection || schema.collection;
		collection = collectionName && resources['db-mongodb'].collection(collectionName);
		if(!collection) return void haveResponse(new Error('No MongoDB mapping found in schema'));

		// Determine how to query for the resource, if already in the database
		// FIXME use a proper JSON Hyper-schema processor for this
		var selfTpl = linkTemplates.filter(function(v){ return v.rel=='self'; }).map(function(v){ return v.href; })[0];
		if(!selfTpl) return void callback(new Error('No self relation found to store record by'));
		where = new Uritpl(selfTpl).fromUri(resources.variant.resource) || {};

		var cursor = collection.find(where, {limit:2});
		cursor.count(haveReplaceCount.bind(cursor));
	}
	function haveReplaceCount(err, count){
		if(count>1){
			// The query we would make to update the resource could affect any one of multiple resources, we don't know which one! Abort!
			response.statusCode = 500;
			response.setHeader('Content-Type', 'text/plain');
			response.end("500 Internal Server Error\nRequest identifies multiple records\n");
			callback(null, {"http://magnode.org/HTTPResponse":500});
		}else{
			this.nextObject(testReplace);
		}
	}
	/*
	Pre-update find():
	* Determine if resource exists at request-URI + Content-Type.
	* If the expectation headers do not match the state of the resource, abort with 412 (Precondition Failed)
	* If the record exists, and we expect it to exist, then set type of operation to update (upsert=false) with a `where` clause to select the record's unique id
	* If the record does not exist as expected, then set type of operation to insert. If the document is inserted by another process since the "find" operation, we will get an index conflict error.  
	update():
	* Assign a new etag in the designated etag field, if any
	* Upsert the document with the following conditions:
		* Determine if the resource exists by matching the URI to a given query by URI Template, if such a query can be extracted
		* If the resource exists and _id is given and it is different than the existing document, mongodb will fail
	* If there is an abort/fail, return appropriate status code
	* Else, replace existing document
	*/
	function testReplace(err, replaceDoc){
		function preconditionFailed(){
			response.statusCode = 412;
			response.setHeader('Content-Type', 'text/plain');
			response.end("412 Precondition Failed\n");
			callback(null, {"http://magnode.org/HTTPResponse":412});
		}
		// TODO what do we do if the document has no ETag support? Fail? Ignore the headers? Both could be dangerous

		var docEtag = replaceDoc && replaceDoc[schema.etagField] && replaceDoc[schema.etagField].toString();
		if(request.headers['if-match']==='*'){
			// Only continue if there's an existing document
			if(!replaceDoc){
				return void preconditionFailed();
			}
		}else if(request.headers['if-match']){
			// Only continue if there's an existing document with one of the given ETags
			var etags = parseETag(request.headers['if-match']);
			// If any from `etag` matches replaceDoc[etagField], then
			if(!etags.some(function(v){ return v===docEtag; })){
				return void preconditionFailed();
			}
		}else if(request.headers['if-none-match']==='*'){
			// Only continue if there's no existing document
			if(replaceDoc){
				return void preconditionFailed();
			}
		}else if(request.headers['if-none-match']){
			// Only continue if there's no existing document with one of the given ETags
			// I.e. Only perform update/insert if the existing document (if any) is not one of the following
			// Why? Idk. TODO
			var etags = parseETag(request.headers['if-none-match']);
			// FIXME assume for now that no one in their right mind wants to use this header in a PUT request
			return void preconditionFailed();
		}else{
			// TODO If desired, send 428 (Precondition Required)
		}

		// Make a copy of the resource, if desired
		if(schema.put.insertRevision){
			// Store a copy of the new document in a collection
			var revision = {_id:null, _parent:replaceDoc&&replaceDoc._id};
			for(var k in parsedData) if(k[0]!='$' && revision[k]===undefined) revision[k] = parsedData[k];
			revision._id = new ObjectId;
			var insertCollection = resources['db-mongodb'].collection(schema.put.insertRevision);
			operations.push({collection:insertCollection, insert:revision, schema:schema});
		}

		// Update the specified resource
		var revision = {};
		for(var k in parsedData) if(k[0]!='$' && revision[k]===undefined) revision[k] = parsedData[k];
		if(docEtag){
			where[schema.etagField] = docEtag;
		}

		if(replaceDoc){
			operations.push({collection:collection, update:revision, where:where, schema:schema, updateCount:1});
		}else{
			operations.push({collection:collection, insert:revision, schema:schema});
		}

		// Do make sure we can carry out the operation
		// Editing a resource requires that the user have edit permissions for EVERY type it is an instance of
		var typeChecks = [];
		types.forEach(function(type){
			// Resources won't ever be undefined which is good
			var input = Object.create(resources.requestenv);
			input[type] = parsedData;
			typeChecks.push(input);
		});
		iterateTypeCheck(0);
		function iterateTypeCheck(i){
			var typeDoc = typeChecks[i];
			if(typeDoc===undefined) return void runOperations();
			authz.test(authResources, ['edit'], typeDoc, function(authorized){if(authorized===true){
				iterateTypeCheck(i+1);
			}else{
				response.statusCode = 403;
				response.end("transform.HTTPAuto_typeMongoDB_Put: Edit <"+resources.variant.resource+"> type <"+parsedData.type[i]+">: Denied\n");
				callback(null, {"http://magnode.org/HTTPResponse":403});
			}});
		}
	}
	function runOperations(){
		// return void haveResponse(new Error('Operations:\n'+util.inspect(operations, false, null, false)+'\n'));
		// console.log(util.inspect(operations, false, null, false));
		if(operations.length){
			nextOperation(0);
		}else{
			haveResponse(new Error('No database operations were made. (Is this intentional?)'));
		}
		function nextOperation(i){
			var op = operations[i];
			if(!op) return void haveResponse();
			var db = op.collection;
			if(op.insert){
				var options = { upsert:op.upsert, multi:op.multi };
				db.insert(escapeMongoObject(op.insert), options, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.update){
				var options = { upsert:op.upsert, multi:op.multi };
				db.update(op.where, escapeMongoObject(op.update), options, function(err, count){
					if(err) return void haveResponse(err);
					if(typeof op.updateCount=='number' && op.updateCount!==count){
						haveResponse(new Error('Mongo query should have updated '+op.updateCount+' documents, but only updated '+count));
						return;
					}
					nextOperation(i+1);
				});
			}else{
				haveResponse(new Error('Unknown database operation'));
			}
		}
	}
	function haveResponse(err){
		if(err){
			response.statusCode = 400;
			response.write(err.stack||err.toString());
			response.end("\n");
			callback(null, {"http://magnode.org/HTTPResponse":400});
			return;
		}
		// Redirect to the resource given its URI
		links.forEach(function(link){
			var ref = relativeuri(resources.rdf, link.object.toString());
			// FIXME??? The semantics of LINK in a PUT response are entirely unclear, but nonetheless legal
			response.addHeader('Link', '<'+ref+'>;rel="'+link.predicate.toString()+'"');
		});
		var self = links.filter(function(link){
			return link.predicate.toString()===relns('self');
		});
		if(self[0]) response.setHeader('Location', relativeuri(resources.rdf, self[0].object.toString()));
		if(resources.indexer){
			// FIXME Normally, calls out to hooks will iterate through functions defined in an RDF Collection
			// However, for brevity and for need, and because we're only triggering a notification, we'll
			// just call a standard event here
			resources.indexer.emit('HTTPAuto_typeMongoDB_Put_Object', db, transform, resources, render, parsedData, schema, links);
			resources.indexer.emit('HTTPAuto_typeMongoDB_Put_Operations', db, transform, resources, operations);
		}

		// Return "200 OK" "201 Created" or "204 No Content" as appropriate
		response.statusCode = 204;
		response.end();
		callback(null, {"http://magnode.org/HTTPResponse":204});
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_MongoDB_Put";
