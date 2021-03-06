/*
e.g.:
Transform:HTMLBody_type<Type>_Put
	a view:ModuleTransform, view:Transform, view:PutTransform ;
	view:module "magnode/transform.HTTPAuto_typeMongoDB_Put" ;
	view:domain type:Post ;
	view:range type:HTTPResponse .
Transform:HTMLBody_type<Type>_Delete
	a view:ModuleTransform, view:Transform, view:DeleteTransform ;
	view:module "magnode/transform.HTTPAuto_typeMongoDB_Delete" ;
	view:domain type:Post ;
	view:range type:HTTPResponse .
*/

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
var unescapeMongoObject = require('./mongoutils').unescapeObject;
var hook = require('./hook');

/* Parse the list of ETags in an ETag header, stripping quotes and Weak token */
function parseETag(header){
	return header.split(',').map(function(v){
		var match;
		match = v.trim().match(/^(W\/)?"(.*)"$/);
		if(!match) throw new Error('Invalid ETag');
		return match[2];
	});
}

function deleteUndefined(o){
	for(var n in o){
		if(o[n]===undefined) delete o[n];
		else if(typeof o[n]=='object') deleteUndefined(o[n]);
	}
}

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceType = db.getCollection(resourceTypesFirst)[0].toString();
	var resourceRange = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object.toString();});

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;

	var parsedData = resources[resourceType];
	var operations = [];
	var links, types, revision;
	var linkTemplates;
	var schema;
	var validator = new jsonschema.Validator;
	var where;
	var collectionName, collection, replaceDoc;

	var authResources = Object.create(resources);
	//authResources.access_token = resources.access_token;

	var editPermissions, validateUpload;
	switch(request.method){
		case 'PUT':
			editPermissions = ['put'];
			persistPermissions = ['put'];
			validateUpload = true;
			break;
		case 'DELETE':
			editPermissions = ['delete'];
			persistPermissions = ['put', 'delete'];
			validateUpload = false;
			break;
		default:
			return void callback(new Error('Unknown method '+JSON.stringify(request.method)+' for HTTPAuth_typeMongoDB_Put'));
	}

	parseFormAuth();

	function parseFormAuth(){
		authz.test(authResources, editPermissions, resources, function(authorized){if(authorized===true){
			// For all requests, the schema will provide us information on how to locate the resource
			// For PUT requests, the instance will be validated against the schema
			importSchema(resourceType, function(){
				schema = validator.schemas[resourceType];
				if(schema.put && schema.put.projectionTarget){
					importSchema(schema.put.projectionTarget, haveSchemas);
				}else{
					haveSchemas();
				}
			});
		}else{
			response.statusCode = 401;
			response.end("transform.HTTPAuto_typeMongoDB_Put: `put` <"+resources.resource+">: Denied\n");
			callback(null, {"http://magnode.org/HTTPResponse":response.statusCode});
		}});
	}

	function importSchema(uri, cb){
		validator.unresolvedRefs.push(uri);
		importNextSchema(cb);
	}

	function importNextSchema(cb){
		var nextSchemaId = validator.unresolvedRefs.shift();
		if(!nextSchemaId) return void cb();
		nextSchemaId = nextSchemaId.split('#',1)[0];
		if(validator.schemas[nextSchemaId]) return void importNextSchema(cb);
		// Test the URI, or for URI with appended # since that's the same thing
		resources['db-mongodb-schema'].findOne({id:{$in:[nextSchemaId,nextSchemaId+'#']}}, function haveSchema(err, typeDoc){
			if(err) return void haveResponse(err);
			else if(!typeDoc) return void haveResponse(new Error('No such schema <'+nextSchemaId+'> found'));
			validator.addSchema(unescapeMongoObject(typeDoc));
			importNextSchema(cb);
		});
	}

	function haveSchemas(){
		schema = validator.schemas[resourceType];
		// Scan for links
		linkTemplates = schema.links || [];
		// This URI-parsing behavior is tied to that in scan.MongoDBJSONSchema.js
		links = [];
		linkTemplates.forEach(function(v){
			var tpl = new Uritpl(v.href);
			// FIXME use the actual node URI as the subject
			if(!v.rel) return;
			var predicate = rdfenv.createNamedNode(new IRI(relns('')).resolveReference(v.rel).toString());
			var statement = new rdfenv.createTriple(rdfenv.createNamedNode(resources.variant.resource), predicate, rdfenv.createNamedNode(tpl.fillFromObject(parsedData)));
			links.push(statement);
		});

		// Verify that the resource is a valid instance
		if(validateUpload){
			try {
				validator.attributes._schema = function(){}; // Don't hande _schema attributes in schemas
				var result = validator.validate(parsedData, schema);
				if(!result.valid) throw new Error('Instance does not validate against schema:\n'+result.toString());
			}catch(err){
				response.statusCode = 400;
				response.write(err.stack||err.toString());
				response.end("\n");
				callback(null, {"http://magnode.org/HTTPResponse":400});
				return;
			}
		}

		types = links.filter(function(v){ return v.predicate.toString()===relns('type'); }).map(function(v){ return v.object.toString(); });
		if(types.length<1){
			return void callback(new Error('Document has no type list'));
		}

		collectionName = schema.mongoCollection || schema.collection;
		collection = collectionName && resources['db-mongodb'].collection(collectionName);
		if(!collection) return void haveResponse(new Error('No MongoDB mapping found in schema'));

		// Determine how to query for the resource, if already in the database
		// FIXME use a proper JSON Hyper-schema processor for this
		where = linkTemplates
			.filter(function(v){ return v.rel=='self'; })
			.map(function(v){ return new Uritpl(v.href).fromUri(resources.variant.resource); })
			.filter(function(v){ return v; })[0];
		if(!where) return void callback(new Error('No self relation found to store record by for resource <'+resources.variant.resource+'>'));
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
	function testReplace(err, _replaceDoc){
		replaceDoc = _replaceDoc;
		function preconditionFailed(header){
			response.statusCode = 412;
			response.setHeader('Content-Type', 'text/plain');
			response.end("412 Precondition Failed\nFailure: "+header+"\n");
			callback(null, {"http://magnode.org/HTTPResponse":412});
		}
		// TODO what do we do if the document has no ETag support? Fail? Ignore the headers? Both could be dangerous

		var docEtag = replaceDoc && replaceDoc[schema.etagField] && replaceDoc[schema.etagField].toString();
		if(request.headers['if-match']==='*'){
			// Only continue if there's an existing document
			if(!replaceDoc){
				return void preconditionFailed('If-Match');
			}
		}else if(request.headers['if-match']){
			// Only continue if there's an existing document with one of the given ETags
			try {
				var etags = parseETag(request.headers['if-match']);
			} catch(e) {
				return void callback(e);
			}
			// If any from `etag` matches replaceDoc[etagField], then
			if(!etags.some(function(v){ return v===docEtag; })){
				return void preconditionFailed('If-Match');
			}
		}else if(request.headers['if-none-match']==='*'){
			// Only continue if there's no existing document
			if(replaceDoc){
				return void preconditionFailed('If-None-Match');
			}
		}else if(request.headers['if-none-match']){
			// Only continue if there's no existing document with one of the given ETags
			// I.e. Only perform update/insert if the existing document (if any) is not one of the following
			// Why? Idk. TODO
			try {
				var etags = parseETag(request.headers['if-none-match']);
			} catch(e) {
				return void callback(e);
			}
			// FIXME assume for now that no one in their right mind wants to use this header in a PUT request
			return void preconditionFailed('If-None-Match');
		}else{
			// TODO If desired, send 428 (Precondition Required)
		}

		// Make a copy of the resource, if desired
		if(schema.put && schema.put.insertRevision){
			// Store a copy of the new document in a collection
			var insertRevision = {_id:null, _parent:replaceDoc&&replaceDoc._id};
			for(var k in parsedData) if(k[0]!='$' && insertRevision[k]===undefined) insertRevision[k] = parsedData[k];
			insertRevision._id = new ObjectId;
			var insertCollection = resources['db-mongodb'].collection(schema.put.insertRevision);
			deleteUndefined(insertRevision);
			operations.push({collection:insertCollection, insert:insertRevision, schema:schema});
		}

		// Update the specified resource
		revision = {};
		if(schema.put && schema.put.projectionMapping){
			// Copy the old document, if any
			if(replaceDoc){
				for(var k in replaceDoc) if(k[0]!='$' && revision[k]===undefined) revision[k] = replaceDoc[k];
			}else{
				// This is a new resource
				var baseSchema = validator.schemas[schema.put.projectionTarget];
				// If projectionTarget schema has a `default` property, fill `revision` with that
				if(typeof baseSchema.default=='object'){
					for(var n in baseSchema.default) revision[n] = baseSchema.default[n];
				}
			}
			// Overwrite the mapped fields
			var map = schema.put.projectionMapping;
			for(var mapName in map){
				var nativeName = map[mapName] || mapName;
				revision[nativeName] = parsedData[mapName];
			}
			if(schema.put.projectionTarget){
				resourceType = schema.put.projectionTarget;
			}else{
				throw new Error('projectionTarget is required with projectionMapping');
			}
			parsedData = revision;
			return void haveSchemas();
		}else{
			// Copy the provided document
			for(var k in parsedData) if(k[0]!='$' && revision[k]===undefined) revision[k] = parsedData[k];
		}
		if(docEtag){
			where[schema.etagField] = docEtag;
		}
		if('_id' in revision){
			if(!(revision._id instanceof ObjectId)){
				return void callback(new Error('Incoming revision _id must be an ObjectId'));
			}
		}else if(replaceDoc){
			if(replaceDoc._id){
				revision._id = where._id = replaceDoc._id;
			}
		}else{
			// If the document doesn't already exist or is falsy, give it an _id
			revision._id = new ObjectId;
		}

		deleteUndefined(revision);
		if(request.method=='DELETE'){
			operations.push({collection:collection, remove:true, where:where, schema:schema, updateCount:1});
		}else if(replaceDoc){
			operations.push({collection:collection, where:where, update:revision, schema:schema, updateCount:1});
		}else{
			operations.push({collection:collection, insert:revision, schema:schema});
		}

		// Do make sure we can carry out the operation
		// Editing a resource requires that the user have edit permissions for EVERY type it is an instance of
		var typeChecks = [];
		types.forEach(function(type, i){
			// Resources won't ever be undefined which is good
			var input = Object.create(resources.requestenv);
			input[type] = revision;
			typeChecks[i] = input;
		});
		iterateTypeCheck(0);
		function iterateTypeCheck(i){
			var typeDoc = typeChecks[i];
			if(typeDoc===undefined) return void runCache();
			authz.test(authResources, persistPermissions, typeDoc, function(authorized){if(authorized===true){
				iterateTypeCheck(i+1);
			}else{
				response.statusCode = 401;
				response.end("transform.HTTPAuto_typeMongoDB_Put: Edit <"+resources.variant.resource+"> type <"+types[i]+">: Denied\n");
				callback(null, {"http://magnode.org/HTTPResponse":response.statusCode});
			}});
		}
	}
	function runCache(){
		// Maybe put this before iterateTypeCheck so permissions can use cache data. But permission checking is async anyways so maybe not.
		var res;
		if(resources.indexer){
			if(request.method=='PUT'){
				res = resources.indexer['MongoDB_Cache_Put'].emit(db, transform, resources, render, revision, schema, links);
			}else if(request.method=='DELETE'){
				res = resources.indexer['MongoDB_Cache_Delete'].emit(db, transform, resources, where);
			}
		}
		if(res && res.then){
			res.then(function(dataum){
				// TODO do stuff with dataum to modify the object we'll be storing
				if(dataum && dataum instanceof Array){
					dataum.forEach(function(v){
						if(!v) return;
						if(v.type=='CacheItem'){
							if(revision._cache===null) return;
							var _cache = revision._cache = revision._cache || {};
							_cache[v.name] = v.value;
						}else if(v.type=='SelfLink'){
							var _self = revision._self = revision._self || [];
							// TODO parse v.href, ensure it matches the absolute-URI production
							_self.push(v.href);
						}
					});
				}
				runOperations();
			});
		}else{
			runOperations();
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
				var options = { upsert:op.upsert };
				db.insertOne(escapeMongoObject(op.insert), options, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.update){
				// If the _id mismatches the _id of the document we want to replace, we'll get a silent error
				// Check for this case where possible
				if(op.update._id && !(op.update._id instanceof ObjectId)){
					return void haveResponse(new Error('_id is not an ObjectId'));
				}
				var options = { upsert:op.upsert };
				db.updateOne(op.where, escapeMongoObject(op.update), options, function(err, result){
					if(err) return void haveResponse(err);
					var count = result.matchedCount;
					if(typeof op.updateCount=='number' && op.updateCount!==count){
						haveResponse(new Error('Mongo query should have updated '+op.updateCount+' documents, but actually updated '+JSON.stringify(count)));
						return;
					}
					nextOperation(i+1);
				});
			}else if(op.remove){
				var options = { multi:op.multi };
				db.removeOne(op.where, options, function(err, result){
					if(err) return void haveResponse(err);
					var count = result.deletedCount;
					if(typeof op.updateCount=='number' && op.updateCount!==count){
						haveResponse(new Error('Mongo query should have removed '+op.updateCount+' documents, but actually removed '+JSON.stringify(count)));
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
		if(validateUpload){
			links.forEach(function(link){
				var ref = relativeuri(resources.rdf, resources.request.uri, link.object.toString());
				// FIXME??? The semantics of Link: in a PUT/DELETE response are entirely unclear, but nonetheless legal
				response.addHeader('Link', '<'+ref+'>;rel="'+link.predicate.toString()+'"');
			});
			var self = links.filter(function(link){
				return link.predicate.toString()===relns('self');
			});
			if(self[0]) response.setHeader('Location', relativeuri(resources.rdf, resources.request.uri, self[0].object.toString()));
		}
		var next;
		if(resources.indexer){
			// FIXME Normally, calls out to hooks will iterate through functions defined in an RDF Collection
			// However, for brevity and for need, and because we're only triggering a notification, we'll
			// just call a standard event here
			if(request.method=='PUT'){
				next = resources.indexer['MongoDB_Index_Put'].emit(db, transform, resources, render, revision, schema, links);
			}else if(request.method=='DELETE'){
				next = resources.indexer['MongoDB_Index_Delete'].emit(db, transform, resources, where);
			}
		}
		if(next && next.then) next.then(sendOK).done();
		else sendOK();
	}
	function sendOK(){
		// Return "200 OK" "201 Created" or "204 No Content" as appropriate
		if(replaceDoc){
			response.statusCode = 204; // No Content
		}else{
			response.statusCode = 201; // Created
		}
		response.end();
		var res = {};
		resourceRange.forEach(function(v){ res[v] = null; });
		res["http://magnode.org/HTTPResponse"] = response.statusCode;
		callback(null, res);
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_MongoDB_Put";
