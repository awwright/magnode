/*
e.g. Transform:HTMLBodyAuto_typeType_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/
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
	var document, parsedData, operations=[], postCommit=[];

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
		input['db-mongodb-schema'].findOne({subject:fieldData._type}, haveSchema);
	}
	function haveSchema(err, typeDoc){
		if(err) return haveResponse(err);
		var schema = typeDoc.schema;
		parsedData._id = new ObjectId(fieldData._id);
		schema.updateDocument = {set:{key:"_id", ifMatch:"_etag"}};
		// This function modifies a Mongo document based on input parsed against
		// a schema that defines how to modify the document. D'oh.
		function writeInstance(instance, schema, options, ctx){
			//console.log(ctx.propertyPath+':');
			//console.log(instance);
			//console.log(schema);
			//console.log('');
			if(schema.updateDocument){
				delete instance._etag;
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
			var result = validator.validate(parsedData, schema, {rewrite:writeInstance});
			if(result.length) throw new Error('Instance does not validate against schema');
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
		function nextOperation(i){
			var op = operations[i];
			if(op===undefined) return haveResponse();
			if(op.set && op.collection=='nodes'){
				var _id = parsedData._id;
				var db = input.db;
				delete op.set._id;
				console.log('UPDATE', {_id:_id}, {$set:op.set});
				db.update({_id:_id}, {$set:op.set}, function(err){
					if(err) throw err;
					nextOperation(i+1);
				});
			}else{
				console.log('Um, do something here: ', op);
				nextOperation(i+1);
			}
		}
		nextOperation(0);
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
