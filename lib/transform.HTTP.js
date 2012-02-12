/*
Transform:HTTP
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.HTTP" ;
	view:domain type:Document ;
	view:range type:HTTPResponse .
*/
var util=require("util");
module.exports = function(db, transform, input, render, callback){
	input.response.setHeader("Content-Type", "text/html");
	if(input.resource) input.response.setHeader("Content-Location", input.resource);
	input.response.end(input["http://magnode.org/Document"]);
	callback({"http://magnode.org/HTTPResponse":200});
}
module.exports.URI = "http://magnode.org/transform/HTTP";
