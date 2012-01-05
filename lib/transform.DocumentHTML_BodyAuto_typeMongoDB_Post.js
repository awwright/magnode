/*
Transform:HTTP
	a view:ModuleTransform ;
	jst:module "magnode/transform.HTTP" ;
	view:range type:HTTPRequest-www-form-urlencoded ;
	view:domain type:Document .
*/
var util=require("util");
var url=require("url");
var rdf=require("rdf");
rdf.environment.setPrefix("sp","http://spinrdf.org/sp#");

var ObjectId = require('mongodb-mongolian').ObjectId;

function stringtoType(value, type){
	if(type=="URI" || type=="") return value;
	if(type[0]=="@") return value.l(type);
	return type.tl(type);
}

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
			switch(fields['type.'+name]){
				case 'ObjectId': document[name] = fields['value.'+name]?ObjectId(fields['value.'+name]):undefined; break;
				case 'json': document[name] = JSON.parse(fields['value.'+name]); break;
				case 'string': document[name] = fields['value.'+name]; break;
			}
		}
	} catch(e){
		response.write(util.inspect(input)+"\n");
		response.write("transform.autoHTMLBodyFormPost: Cannot parse JSON for field.\n");
		response.write((e.stack||e.toString())+"\n");
		response.write((new Error('Caught at')).stack);
		response.end();
		callback({"http://magnode.org/HTTPResponse":303});
		return;
	}

	authz({method:"PUT", resource:input.resource}, function(result){if(result){
		/*
		response.write("Document: ");
		response.write(util.inspect(document));
		response.write("\n\n");

		response.write("Fields: ");
		response.write(util.inspect(fields));
		response.write("\n\n");
		*/
		input['db-mongodb'].save(document, function(){
			//response.write(util.inspect(arguments)+"\n\n");
			// respond with "303 See Other" and "Location:" to that resource
			// (instruct the client to GET the newly updated resource), and return
			response.statusCode = 303;
			var action = url.parse(input.request.url, true);
			action.search = undefined;
			action.query = undefined;
			response.setHeader("Location", url.format(action));
			response.end("transform.autoHTMLBodyFormPost: Update <"+input.resource+">\n");
			callback({"http://magnode.org/HTTPResponse":303});
		});
	}else{
		response.statusCode = 403;
		response.end("transform.autoHTMLBodyFormPost: Update <"+input.resource+">: Denied\n");
		callback({"http://magnode.org/HTTPResponse":403});
	}});
}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
