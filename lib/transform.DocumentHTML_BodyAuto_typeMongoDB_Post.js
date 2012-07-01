/*
e.g. Transform:DocumentHTML_BodyAuto_typeType_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/
var util=require("util");
var url=require("url");
var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var fields = input["http://magnode.org/FormFieldData"];
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	response.setHeader("Content-Type", "text/plain");
	var document = {};

	try {
		if(!fields||!fields['fields']) throw new Error("Invalid form information");
		var fieldNames = JSON.parse(fields['fields']);
		if(!fieldNames instanceof Array) throw new Error("Fields not listed");
		for(var i=0; i<fieldNames.length; i++){
			var name = fieldNames[i];
			switch(fields['format.'+name]){
				case 'ObjectId': document[name] = fields['value.'+name]?new ObjectId(fields['value.'+name]):undefined; break;
				case 'json': document[name] = JSON.parse(fields['value.'+name]); break;
				case 'string': document[name] = fields['value.'+name]; break;
				case 'checkbox': document[name] = (fields['value.'+name]=='1')?true:false; break;
				case 'shadow':
					if(fields['value.'+name] && fields['value.'+name]==fields['confirm.'+name]){
						var newPassword = fields['value.'+name];
						document[name] = (new Date).toISOString();
						// TODO update the shadow password here, remember permissions
					}
					break;
				case 'noop':
					break;
				default:
					throw new Error('Unknown format '+JSON.stringify(fields['format.'+name])+' for field '+name);
					break;
			}
		}
	} catch(e){
		response.write("transform.DocumentHTML_BodyAuto_typeMongoDB_Post: Cannot parse JSON for field schema.\n");
		response.write((e.stack||e.toString())+"\n");
		response.write("fields: "+util.inspect(fields)+"\n");
		response.write("input: "+util.inspect(input)+"\n");
		response.end();
		callback({"http://magnode.org/HTTPResponse":303});
		return;
	}

	authz.test(null, "PUT", input, function(result){if(result){
		/*
		console.log("Document: ");
		console.log(util.inspect(document));
		console.log("\n\n");

		console.log("Fields: ");
		console.log(util.inspect(fields));
		console.log("\n\n");
		*/
		try{
			if(fields['_id']){
				input['db-mongodb'].update({_id:new ObjectId(fields['_id'])}, {$set:document}, end);
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
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
