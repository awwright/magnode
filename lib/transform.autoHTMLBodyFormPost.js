/*
Transform:HTTP
	a view:ModuleTransform ;
	jst:module "magnode/transform.HTTP" ;
	view:range type:HTTPRequest-www-form-urlencoded ;
	view:domain type:Document .
*/
var util=require("util");
module.exports = function(db, transform, input, render, callback){
	var fields = input["http://magnode.org/FormFieldData"];
	var response = input.response;

	// respond with "303 See Other" and "Location:" to that resource
	// (instruct the client to GET the newly updated resource), and return
	//response.statusCode = 303;
	// Use of ternary operator without syntax highlighting mind == blown
	//response.setHeader("Location", request.url.replace(/(\?|&)edit($|&)/,function(a,b,c){return c=='&'&&b=='?'?'?':'';}));

	response.setHeader("Content-Type", "text/plain");
	var query =
		{ a:'sp:Modify'
		};

	query['sp:deletePattern'] = [].toList();
	query['sp:insertPattern'] = [].toList();
	query['sp:where'] = [].toList();

	response.write("Query: ");
	response.write(util.inspect(query));
	response.write("\n");
	response.write("Fields: ");
	response.write(util.inspect(fields));
	response.write("\n");
	response.end("transform.autoHTMLBodyFormPost: Update <"+input.resource+">\n");

	callback({"http://magnode.org/HTTPResponse":303});

}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
