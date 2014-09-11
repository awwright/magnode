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
var url=require('url');

var jsonschema=require('jsonschema');
var rdf=require('rdf');
var rdfenv = rdf.environment;
var ObjectId = require('mongodb').ObjectID;
var contenttype=require('contenttype');
var Uritpl = require('uri-templates');

var render=require('./render');
var relativeuri=require('./relativeuri');

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceType = db.getCollection(resourceTypesFirst)[0].toString();

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;

	var parsedData = resources[resourceType];
	var operations = [];
	var links = [];
	var schema = null;

	//if(typeof fieldData._id!='string'){
	//	return void haveResponse(new Error('No _id field specified while using form submission'));
	//}

	var authResources = Object.create(resources);
	//authResources.access_token = resources.access_token;

	// Read the "profile" property off of the request.headers['content-type'] media-type
	if(request.headers['content-type']){
		var contentType = contenttype.parseMedia(request.headers['content-type']);
		if(contentType.type=='application/json' && contentType.params.profile!=resourceType){
			return void callback(new Error('Provided Content-Type ('+request.headers['content-type']+') mismatches transform domain (<'+resourceType+'>)'));
		}
	}

	parseFormAuth();

	function parseFormAuth(){
		authz.test(authResources, ['put'], resources, function(authorized){if(authorized===true){
			resources['db-mongodb-schema'].findOne({subject:resourceType}, haveSchema);
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

		var updateId = undefined;
		var allowUpdate = true;
		var allowInsert = true;
		if(request.headers['if-match']==='*'){
			allowInsert = false;
		}else if(request.headers['if-match']){
			var etag = request.headers['if-match'].split(',').map(function(v){
				var match;
				match = v.trim().match(/^(W\/)?"(.*)"$/);
				if(!match) throw new Error('Invalid ETag');
				try{
					return new ObjectId(match[2]);
				}catch(e){
					return match[2];
				}
			}).filter(function(v){return v;});
			// For now we will only support the first ETag in the header
			updateId = etag[0];
			allowInsert = false;
		}else if(request.headers['if-none-match']==='*'){
			// Require an insert - don't overwrite any data
			allowUpdate = false;
		}else if(request.headers['if-none-match']){
			// ???
		}

		// Scan for links
		var linkTemplates = schema.links || [];
		// This URI-parsing behavior is tied to that in scan.MongoDBJSONSchema.js
		linkTemplates.forEach(function(v){
			var tpl = new Uritpl(v.href);
			// FIXME use the actual node URI as the subject
			var statement = new rdfenv.createTriple(rdfenv.createNamedNode(resources.variant.resource), rdfenv.createNamedNode(v.rel), rdfenv.createNamedNode(tpl.fillFromObject(parsedData)));
			links.push(statement);
		});
		var collection = schema.mongoCollection || schema.collection || resources['db-mongodb-nodes'];
		if(!collection) return void haveResponse(new Error('No MongoDB mapping found in schema'));

		// Verify that the resource is a valid instance
		try {
			var validator = new jsonschema.Validator;
			validator.attributes._schema = function(){};
			var result = validator.validate(parsedData, schema);
			if(!result.valid) throw new Error('Instance does not validate against schema:\n'+result.toString());
			// TODO use the hyper-schema to extract "type" link relations, instead of a hard-coded Array
			var types = (Array.isArray(parsedData.type) && parsedData.type) || [];
			types = types.concat(links.filter(function(v){ return v.predicate=='type'; }).map(function(v){ return v.object; }));
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

		// Make a copy of the resource, if desired
		if(schema.put.insertRevision){
			// Store a copy of the new document in a collection
			var revision = {_id: null, _parent:updateId};
			for(var k in parsedData) if(k[0]!='$' && revision[k]===undefined) revision[k] = parsedData[k];
			revision._id = new ObjectId;
			operations.push({collection:schema.put.insertRevision, insert:revision, schema:schema});
		}

		// Update the specified resource
		var revision = {};
		// Determine how to identify the resource, if already in the database
		// FIXME use a proper JSON Hyper-schema processor for this
		var linkTemplates = schema.links || [];
		var selfTpl = linkTemplates.filter(function(v){ return v.rel=='self'; }).map(function(v){ return v.href; })[0];
		// FIXME This only works for the root-most storeResource
		// sub-resources with anonymous URIs can't generate a `where` clause
		var where = selfTpl && new Uritpl(selfTpl).fromUri(resources.variant.resource) || {};
		for(var k in parsedData) if(k[0]!='$' && revision[k]===undefined) revision[k] = parsedData[k];
		// _id is special to MongoDB
		if(parsedData._id){
			where._id = parsedData._id;
			//delete revision._id;
		}
		if(updateId){
			// TODO corerce this into an ObjectId or Date as necessary
			where._rev = updateId;
		}
		if(allowUpdate){
			operations.push({collection:collection, update:revision, where:where, upsert:allowInsert, schema:schema});
		}else if(allowInsert){
			operations.push({collection:collection, insert:revision, schema:schema});
		}else{
			return void haveResponse(new Error('Cannot update nor insert'));
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
				response.end("transform.HTTPAuto_typeMongoDB_Put: Edit <"+parsedData.subject+"> type <"+parsedData.type[i]+">: Denied\n");
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
			var db = (typeof op.collection=='object')?op.collection:resources['db-mongodb'].collection(op.collection);
			if(op.insert){
				var options = { upsert:op.upsert, multi:op.multi };
				db.insert(op.insert, options, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.update){
				var options = { upsert:op.upsert, multi:op.multi };
				db.update(op.where, op.update, options, function(err, count){
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
			return link.predicate.toString()==='self';
		});
		if(self[0]) response.setHeader('Location', relativeuri(resources.rdf, self[0].object.toString()));
		if(resources.indexer){
			// FIXME Normally, calls out to hooks will iterate through functions defined in an RDF Collection
			// However, for brevity and for need, and because we're only triggering a notification, we'll
			// just call a standard event here
			resources.indexer.emit('HTTPAuto_typeMongoDB_Put_Object', db, transform, resources, render, parsedData, schema);
			resources.indexer.emit('HTTPAuto_typeMongoDB_Put_Operations', db, transform, resources, operations);
		}

		// Return "200 OK" "201 Created" or "204 No Content" as appropriate
		response.statusCode = 204;
		response.end();
		callback(null, {"http://magnode.org/HTTPResponse":204});
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_MongoDB_Put";
