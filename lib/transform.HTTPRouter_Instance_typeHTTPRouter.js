/*
Transform:HTTPRouter_Instance_typeHTTPRouter
	a view:ModuleTransform ;
	view:module "transform.HTTPRouter_Instance_typeHTTPRouter"
	view:range type:HTTPRouter_Instance ;
	view:domain type:HTTPRouter .
*/
module.exports = function(db, transform, input, render, callback){
	var routes = input.db.filter({subject:input['http://magnode.org/HTTPRouter'],predicate:'http://magnode.org/route'});
	console.log(routes);
	var router = new (require("magnode/route"));
	callback({"http://magnode.org/HTTPRouter_Instance":router});
}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Instance_typeHTTPRouter";
