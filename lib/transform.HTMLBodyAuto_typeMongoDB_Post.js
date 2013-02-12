/*
e.g. Transform:HTMLBodyAuto_typeType_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/

// Right now this only handles a POST request, or technically, POST and PUT identically
// But we should create a new transform type for each HTTP method

var util=require("util");
var url=require("url");
var jsonschema=require("jsonschema");
var render=require('./render');
var relativeuri=require('./relativeuri');
var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	var fieldData = input["http://magnode.org/FormFieldData"];
	var correctToken = (input['http://magnode.org/UserSession']||{}).formToken||'anonymous';
	if(correctToken!==fieldData._auth){
		response.statusCode = 403;
		response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">: Denied (bad token)\n");
		return callback({"http://magnode.org/HTTPResponse":403});
	}
	var document, parsedData, contentTypeProfile, operations=[], postCommit=[];

	var targetType = 'http://magnode.org/FieldValue';
	var resources = Object.create(input);
	// TODO: Does this pose some sort of security issue?
	resources['http://magnode.org/FormFieldElementObject'] = {name:''};
	resources['http://magnode.org/FormFieldData'] = input['http://magnode.org/FormFieldData'];
	transformTypes = ['http://magnode.org/view/FormDataTransform'];

	function testAuth(){
		authz.test(null, "parse", input, function(authorized){if(authorized){
			render.render(targetType, resources, transformTypes, haveRenderedForm);
		}else{
			response.statusCode = 403;
			response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">: Denied\n");
			callback({"http://magnode.org/HTTPResponse":403});
		}});
	}

	function haveRenderedForm(err, resources){
		if(err){
			return callback(err);
			response.write("transform.HTMLBodyAuto_typeMongoDB_Post: Cannot parse JSON for field schema.\n");
			response.write((err.stack||err.toString())+"\n");
			response.write("fieldData: "+util.inspect(fieldData)+"\n");
			response.write("input: "+util.inspect(input)+"\n");
			response.end();
			callback(null, {"http://magnode.org/HTTPResponse":303});
			return;
		}
		parsedData = resources['http://magnode.org/FieldValue'];
		// TODO read the "profile" property off of the request.headers['content-type'] media-type
		contentTypeProfile = fieldData._type;
		input['db-mongodb-schema'].findOne({subject:contentTypeProfile}, haveSchema);
	}
	function haveSchema(err, typeDoc){
		if(err) return haveResponse(err);
		else if(!typeDoc) return haveResponse(new Error('No such schema <'+contentTypeProfile+'> found'));
		var schema = typeDoc.schema;

		var etag;
		if(request.headers['if-match']){
			if(request.headers['if-match']=='*'){
				etag = true;
			}else{
				etag = request.headers['if-match'].split(',').map(function(v){
					var match;
					try{
						match = v.match(/^(W\/)?"(.*)"$/);
						return new ObjectId(match[2]);
					}catch(e){
						return match && match[2];
					}
				});
				// For now we will only support the first ETag in the header
				etag = etag[0];
			}
		}else if(fieldData._id){
			etag = new ObjectId(fieldData._id);
		}

		// This function modifies a Mongo document based on input parsed against
		// a schema that defines how to modify the document. D'oh.
		function writeInstance(instance, schema, options, ctx){
			//console.log(ctx.propertyPath+':');
			//console.log(instance);
			//console.log(schema);
			//console.log('');
			if(!schema.put) return instance;
			if(schema.put.storeRevision){
				var revision = {_id: null, _parent: instance.$id};
				for(var k in instance) if(k[0]!='$') revision[k] = instance[k];
				revision._id = new ObjectId;
				var where = {subject:input.resource};
				if(instance.$etag) where._id = instance.$etag;
				// Stop serving the old revision and replace with the new revision. Technically this isn't atomic. However,
				// while we do not anticipate a change in cabin pressure during our flight, should one occur, we can just reverse this operation.
				operations.push({collection:'nodes', where:where, update:{$rename:{subject:'_subject'}}, updateCount:1 });
				operations.push({collection:'nodes', insert:revision, schema:schema, name:ctx.propertyPath});
			}
			if(schema.put.updateDocument){
				operations.push({collection:'nodes', set:instance, schema:schema, where:instance[schema.updateDocument.where], name:ctx.propertyPath});
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
			parsedData.$etag = etag;
			parsedData.$id = input.node._id;
			var result = validator.validate(parsedData, schema, {rewrite:writeInstance});
			if(!result.valid) throw new Error('Instance does not validate against schema:\n'+result.toString());
		}catch(err){
			response.statusCode = 400;
			response.write(err.stack||err.toString());
			response.end("\n");
			callback(null, {"http://magnode.org/HTTPResponse":400});
			return;
		}
		// Do additional permission checking here, then run the operations
		runOperations(err);
	}
	function runOperations(){
		if(operations.length){
			nextOperation(0);
		}else{
			haveResponse(new Error('No database operations were made. (Is this intentional?)'));
		}
		function nextOperation(i){
			var op = operations[i];
			if(!op) return haveResponse();
			console.log('Apply operation:', op);
			// Currently working from a limited set of collections
			var collections =
				{ nodes: input['db-mongodb-nodes'] || input['db-mongodb']
				, schema: input['db-mongodb-schema']
				, shadow: input['db-mongodb-shadow']
				};
			var db = collections[op.collection] || collections.nodes;
			if(op.set){
				var _id = op.set._id;
				delete op.set._id;
				db.update({_id:_id}, {$set:op.set}, function(err){
					if(err) throw err;
					nextOperation(i+1);
				});
			}else if(op.insert){
				db.insert(op.insert, function(err){
					if(err) throw err;
					nextOperation(i+1);
				});
			}else if(op.update){
				db.update(op.where, op.update, function(err, count){
					if(err) throw err;
					if(typeof op.updateCount=='number' && op.updateCount!==count){
						throw new Error('Mongo query should have updated '+op.updateCount+' documents, but only updated '+count);
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
		//response.write(util.inspect(arguments)+"\n\n");
		// respond with "303 See Other" and "Location:" to that resource
		// (instruct the client to GET the newly updated resource), and return
		response.statusCode = 303;
		var action;
		// Take us to the canonical URL for this resource
		if(typeof parsedData.subject=='string') action = url.parse(parsedData.subject, true);
		else action = url.parse(input.request.url, true);
		delete action.search;
		delete action.query;
		response.setHeader("Location", relativeuri(input.rdf, url.format(action)));
		response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">\n");
		callback(null, {"http://magnode.org/HTTPResponse":303});
	}

	testAuth();
}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
