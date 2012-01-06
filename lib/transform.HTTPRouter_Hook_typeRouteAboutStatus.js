/*
Transform:HTTPRouter_Hook_typeRouteAboutStatus
	a view:ModuleTransform ;
	view:module "magnode/transform.HTTPRouter_Hook_typeRouteAboutStatus" ;
	view:domain type:RouteAboutStatus ;
	view:range type:HTTPRouter_Hook .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/RouteAboutStatus'];

	var q = input.db.filter({object:subject, predicate:'http://magnode.org/register'});
	if(!q[0] || !q[0].object) throw new Error('No router for '+subject+' found!');
	var router = q[0].subject;

	var resources =
		{ 'http://magnode.org/HTTPRouter': router
		, db: input.db
		};
	render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/HTTPRouter_Instance']) throw new Error('HTTPRouter_Instance for '+subject+' could not be created');
		(require("magnode/route.status"))(r['http://magnode.org/HTTPRouter_Instance']);
		callback({"http://magnode.org/HTTPRouter_Hook":[]});
	});
}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Hook_typeRouteAboutStatus";
