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
var ObjectId = require('mongodb').ObjectID;
var contenttype=require('contenttype');
var Uritpl = require('uri-templates');

var render=require('./render');
var relativeuri=require('./relativeuri');
var formatToken = require('./formatToken');

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceType = db.getCollection(resourceTypesFirst)[0].toString();

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;

	var parsedData = resources[resourceType];
	var operations=[];

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
		var schema = typeDoc.schema || (typeDoc.properties&&typeDoc) || {};

		var updateId = undefined;
		var allowUpdate = true;
		var allowInsert = true;
		if(request.headers['if-match']==='*'){
			allowUpdate = true;
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
			allowUpdate = true;
			allowInsert = false;
		}else if(request.headers['if-none-match']){
			// Require an insert - don't overwrite any data
			allowUpdate = false;
			allowInsert = true;
		}

		var links = [];

		// This function modifies a Mongo document based on input parsed against
		// a schema that defines how to modify the document. D'oh.
		function writeInstance(instance, schema, options, ctx){
			// Scan for links
			var linkTemplates = schema.links || [];
			linkTemplates.forEach(function(v){
				var tpl = new Uritpl(v.href);
				// FIXME use the actual node URI as the subject
				var statement = new rdf.Triple('http://example.com/', v.rel, tpl.fillFromObject(instance));
				links.push(statement);
			});
			if(schema.tokenPattern){
				var value = formatToken.formatToken(parsedData, schema.tokenPattern);
				if(schema.format=='uri'){
					value = url.resolve(resources.rdf.resolve(':'), value).toString();
				}
				return value;
			}
			if(instance && schema.type==='shadow'){
				// FIXME this is a hack... how do we know we're really on the "password" field? We don't.
				var oldShadow = resources.node.password;
				instance._id = new ObjectId;
				operations.push({collection:resources['db-mongodb-shadow'], insert:instance});
				// operations.push({collection:'shadow', remove:{_id: oldShadow}});
				return instance._id;
			}
			if(!schema.put) return instance;
			var collection = schema.mongoCollection || schema.collection || resources['db-mongodb-nodes'];
			if(schema.put.storeRevision){
				// Store all the revisions in a single MongoDB collection... somehow
				var revision = {_id: null, _parent: instance.$id};
				for(var k in instance) if(k[0]!='$' && revision[k]===undefined) revision[k] = instance[k];
				revision._id = new ObjectId;
				var where = {};
				if(instance.$subject) where.subject = instance.$subject;
				if(instance.$etag) where._id = instance.$etag;
				if(where.subject || where._id){
					// Stop serving the old revision and replace with the new revision. Technically this isn't atomic. However,
					// while we do not anticipate a change in cabin pressure during our flight, should one occur, we can just reverse this operation.
					// FIXME first request the resource by the URI router to see if it already exists, and make sure the ETag matches if any
					// Then add updateCount:1 as appropriate
					operations.push({collection:collection, where:where, update:{$rename:{subject:'_subject'}}});
					// operations.push({collection:collection, where:where, update:{$rename:{subject:'_subject'}}, updateCount:1 });
				}
				operations.push({collection:collection, insert:revision, schema:schema, name:ctx.propertyPath});
			}
			if(schema.put.insertRevision){
				// Store a copy of the new document in a collection
				var revision = {_id: null, _parent: instance.$id};
				for(var k in instance) if(k[0]!='$' && revision[k]===undefined) revision[k] = instance[k];
				revision._id = new ObjectId;
				operations.push({collection:schema.put.insertRevision, insert:revision, schema:schema, name:ctx.propertyPath});
			}
			if(schema.put.storeResource){
				// Save/overwrite the document at some location
				var revision = {};
				var where = {};
				for(var k in instance) if(k[0]!='$' && revision[k]===undefined) revision[k] = instance[k];
				// _id is special to MongoDB
				where._id = resources.node._id;
				//delete revision._id;
				operations.push({collection:schema.put.storeResource, update:revision, where:where, upsert:true, schema:schema, name:ctx.propertyPath});
			}
			if(schema.put.updateDocument){
				// Update fields in an existing document
				operations.push({collection:collection, set:instance, schema:schema, where:instance[schema.updateDocument.where], name:ctx.propertyPath});
				if(schema.updateDocument.set){
					// If existing _id does not exist, insert document
					// Elif existing document matches _etag, update document
					// Else return 412 Precondition Failed
				}
				return instance[schema.updateDocument.key];
			}
			return instance;
		}
		try {
			var validator = new jsonschema.Validator;
			validator.attributes._schema = function(){};
			parsedData.$etag = updateId;
			//parsedData.$id = resources.node._id;
			parsedData.$subject = resources.resource;
			var result = validator.validate(parsedData, schema, {rewrite:writeInstance});
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
		if(operations.length){
			nextOperation(0);
		}else{
			haveResponse(new Error('No database operations were made. (Is this intentional?)'));
		}
		function nextOperation(i){
			var op = operations[i];
			if(!op) return void haveResponse();
			var db = (typeof op.collection=='object')?op.collection:resources['db-mongodb'].collection(op.collection);
			if(op.set){
				var _id = op.set._id;
				delete op.set._id;
				db.update({_id:_id}, {$set:op.set}, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.insert){
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
		// Return "200 OK" "201 Created" or "204 No Content" as appropriate
		response.statusCode = 204;
		response.end();
		callback(null, {"http://magnode.org/HTTPResponse":204});
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_MongoDB_Put";
