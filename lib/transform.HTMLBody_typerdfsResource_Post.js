var util=require("util");
var url=require("url");

var rdf=require("rdf");
rdf.environment.setPrefix("sp","http://spinrdf.org/sp#");

function stringtoType(value, type){
	if(type=="URI" || type=="") return value;
	if(type[0]=="@") return value.l(type);
	return value.tl(type);
}

module.exports = function(db, transform, input, render, callback){
	var fields = input["http://magnode.org/FormFieldData"];
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	var deleteQuery =
		{ a:'sp:Modify'
		, sp$where: [{a:'sp:TriplePattern', sp$subject:"sp:_s", sp$predicate:"sp:_p", sp$object:"sp:_o"}]
		, sp$deletePattern: [{a: 'sp:TriplePattern', sp$subject:"sp:_s", sp$predicate:"sp:_p", sp$object:"sp:_o"}].toList()
		, sp$insertPattern: [].toList()
		};

	authz(input.auth, "PUT", input, function(result){if(result){
		// TODO some time here we'll want to not delete any triple we're going to re-insert later
		var deleteQueryGraph = deleteQuery.ref("_:query").graphify();
		var deleteQueryResponse = input.db.evaluateQuery(deleteQueryGraph, "_:query", {s:fields['subject']});

		// respond with "303 See Other" and "Location:" to that resource
		// (instruct the client to GET the newly updated resource), and return
		var action = url.parse(input.request.url, true);
		action.search = undefined;
		action.query = undefined;
		//response.statusCode = 303;
		response.setHeader("Content-Type", "text/plain");
		//response.setHeader("Location", url.format(action));
		response.write("Redirect to <"+url.format(action)+">\n\n");
		///*
		response.write("Delete Query: ");
		response.write(util.inspect(deleteQuery));
		response.write("\n\n");

		response.write("Fields: ");
		response.write(util.inspect(fields));
		response.write("\n\n");

		response.write("Delete Result: ");
		response.write(util.inspect(deleteQueryResponse));
		response.write("\n\n");

		response.write("Insert:\n");
		var length = fields['field.length'];
		for(var i=0; i<length; i++){
			response.write(util.inspect(new rdf.RDFTriple(fields['subject'], fields['field.'+i+'.predicate'], stringtoType(fields['field.'+i+'.object'], fields['field.'+i+'.type'])))+"\n");
			db.add(new rdf.RDFTriple(fields['subject'], fields['field.'+i+'.predicate'], stringtoType(fields['field.'+i+'.object'], fields['field.'+i+'.type'])));
		}
		//*/
		response.end("transform.HTMLBody_typerdfsResource_Post: Update <"+input.resource+">\n");
		callback({"http://magnode.org/HTTPResponse":303});
	}else{
		response.statusCode = 403;
		response.setHeader("Content-Type", "text/plain");
		response.end("transform.HTMLBody_typerdfsResource_Post: Update <"+input.resource+">: Denied\n");
		callback({"http://magnode.org/HTTPResponse":403});
	}});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typerdfsResource_Post";
module.exports.about =
	{ a: ['view:Transform', 'view:PostTransform', 'view:Core']
	, 'view:domain': {$list:['type:Document_Post']}
	, 'view:range': 'type:HTTPResponse'
	};
