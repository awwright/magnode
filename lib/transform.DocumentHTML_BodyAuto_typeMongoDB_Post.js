/*
e.g. Transform:DocumentHTML_BodyAuto_typeType_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/
var util=require("util");
var url=require("url");
var render=require('./view');
var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	var targetType = 'http://magnode.org/MongoDBValue';
	var resources = {'http://magnode.org/FormFieldData': input["http://magnode.org/FormFieldData"]};
	for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];
	// TODO: Does this pose some sort of security issue?
	resources['http://magnode.org/FormFieldElementObject'] = {name:''};
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);

	function haveRenderedForm(err, resources){
		var fieldData = input["http://magnode.org/FormFieldData"];
		if(err){
			response.write("transform.DocumentHTML_BodyAuto_typeMongoDB_Post: Cannot parse JSON for field schema.\n");
			response.write((err.stack||err.toString())+"\n");
			response.write("fieldData: "+util.inspect(fieldData)+"\n");
			response.write("input: "+util.inspect(input)+"\n");
			response.end();
			callback(err, {"http://magnode.org/HTTPResponse":303});
			return;
		}
		var document = resources['http://magnode.org/MongoDBValue'];


		// FIXME
		//response.setHeader("Content-Type", "text/plain");
		//response.end(util.inspect(document, false, null));
		//callback({"http://magnode.org/HTTPResponse":403});


		//return;
		authz.test(null, "PUT", input, function(authorized){if(authorized){
			/*
			console.log("Document: ");
			console.log(util.inspect(document));
			console.log("\n\n");

			console.log("fieldData: ");
			console.log(util.inspect(fieldData));
			console.log("\n\n");
			*/
			try{
				if(fieldData['_id']){
					input['db-mongodb'].update({_id:new ObjectId(fieldData['_id'])}, {$set:document}, end);
				}else{
					input['db-mongodb'].insert(document, end);
				}
			}catch(e){
				// Unusual case, callback was not called
				response.statusCode = 500;
				response.end(e.stack||e.toString());
				callback({"http://magnode.org/HTTPResponse":303});
			}
			function end(err){
				//response.write(util.inspect(arguments)+"\n\n");
				// respond with "303 See Other" and "Location:" to that resource
				// (instruct the client to GET the newly updated resource), and return
				if(err) return callback(err);
				response.statusCode = 303;
				var action = url.parse(input.request.url, true);
				action.search = undefined;
				action.query = undefined;
				response.setHeader("Location", url.format(action));
				response.end("transform.DocumentHTML_BodyAuto_typeMongoDB_Post: Update <"+input.resource+">\n");
				callback(null, {"http://magnode.org/HTTPResponse":303});
			}
		}else{
			response.statusCode = 403;
			response.end("transform.DocumentHTML_BodyAuto_typeMongoDB_Post: Update <"+input.resource+">: Denied\n");
			callback({"http://magnode.org/HTTPResponse":403});
		}});
	}

}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
