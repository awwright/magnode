/*
e.g. Transform:HTMLBodyAuto_typeType_Delete
	a view:ModuleTransform, view:Transform, view:DeleteTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Delete" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/

// Perhaps this will be merged back in with Transform:HTMLBodyAuto_typeType_Post in the future
// Right now we need to figure out how DELETE will work
// It's not clear *what* should be deleted and if it can vary with the supplied Content-Type, if any
// Maybe sometimes we want to just delete the edit-preferred form, other times delete an entire series of blog posts
// For right now we'll just delete the resource in it's preferred form for editing, and ignore embedded/linked resources

var util=require('util');
var url=require('url');
var jsonschema=require('jsonschema');
var render=require('./render');
var relativeuri=require('./relativeuri');
var ObjectId = require('mongolian').ObjectId;
var formatToken = require('./formatToken');

module.exports = function(db, transform, input, render, callback){
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	var fieldData = input["http://magnode.org/FormFieldData"];
	var requestMethod, contentTypeProfile, operations=[];

	var authTest = Object.create(input);
	authTest._auth = fieldData._auth;
	authz.test(authTest, "delete", input, function(authorized){if(authorized===true){
		// TODO read the "profile" property off of the request.headers['content-type'] media-type
		contentTypeProfile = fieldData._type;
		requestMethod = fieldData._method || input.request.method;

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
		
		var where = {};
		if(input.resource) where.subject = input.resource;
		if(etag) where._id = etag;
		if(where.subject || where._id){
			operations.push({collection:'nodes', where:where, update:{$rename:{subject:'_subject'}}, updateCount:1 });
		}

		var typesList = (input.node.type instanceof Array)?input.node.type:[];
		var authTest = Object.create(input);
		authTest._auth = fieldData._auth;
		// Editing a resource requires that the user have edit permissions for EVERY type it is an instance of
		var typeChecks = [];
		typesList.forEach(function(type){
			// Resources won't ever be undefined which is good
			var resources = Object.create(input.requestenv);
			typeChecks.push(resources);
		});
		iterateTypeCheck(0);
		function iterateTypeCheck(i){
			var type = typeChecks[i];
			if(type===undefined) return void runOperations();
			authz.test(authTest, ['edit','delete'], input, function(authorized){if(authorized===true){
				iterateTypeCheck(i+1);
			}else{
				response.statusCode = 403;
				response.end("transform.HTMLBodyAuto_typeMongoDB_Delete: Edit <"+input.resource+"> type <"+typesList[i]+">: Denied\n");
				callback(null, {"http://magnode.org/HTTPResponse":403});
			}});
		}
	}else{
		response.statusCode = 403;
		response.end("transform.HTMLBodyAuto_typeMongoDB_Delete: Delete <"+input.resource+">: Denied\n");
		callback(null, {"http://magnode.org/HTTPResponse":403});
	}});

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
			//console.log('Apply operation:', op);
			// Currently working from a limited set of collections
			var db = (typeof op.collection=='object')?op.collection:input['db-mongodb'].collection(op.collection);
			if(op.set){
				var _id = op.set._id;
				delete op.set._id;
				db.update({_id:_id}, {$set:op.set}, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.insert){
				db.insert(op.insert, function(err){
					if(err) return void haveResponse(err);
					nextOperation(i+1);
				});
			}else if(op.update){
				db.update(op.where, op.update, function(err, count){
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

		var doRedirect = false;
		if(doRedirect){
			// respond with "303 See Other" and "Location:" to that resource
			// (instruct the client to GET the newly updated resource), and return
			response.statusCode = 303;
			var action = '/';
			// Take us to the canonical URL for this resource

			delete action.search;
			delete action.query;
			response.setHeader("Location", relativeuri(input.rdf, url.format(action)));
			response.end("transform.HTMLBodyAuto_typeMongoDB_Delete: Update <"+input.resource+">\n");
			callback(null, {"http://magnode.org/HTTPResponse":303});
		}else{
			response.statusCode = 200;
			response.end("transform.HTMLBodyAuto_typeMongoDB_Delete: Deleted <"+input.resource+">\n");
			callback(null, {"http://magnode.org/HTTPResponse":200});
		}
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_MongoDB_Delete";
