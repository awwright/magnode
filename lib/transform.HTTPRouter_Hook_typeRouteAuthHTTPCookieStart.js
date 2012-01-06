/*
Transform:HTTPRouter_Hook_typeRouteAuthHTTPCookieStart
	a view:ModuleTransform ;
	view:module "magnode/transform.HTTPRouter_Hook_typeRouteAuthHTTPCookieStart" ;
	view:domain type:RouteAuthHTTPCookieStart ;
	view:range type:HTTPRouter_Hook .
*/

module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/RouteAuthHTTPCookieStart'];

	var q = input.db.filter({object:subject, predicate:'http://magnode.org/register'});
	if(!q[0] || !q[0].object) throw new Error('No router for '+subject+' found!');
	var router = q[0].subject;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/auth'});
	if(!q[0] || !q[0].object) throw new Error('No authenticator for '+subject+' given!');
	var auth = q[0].object.toString();

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/target'});
	if(!q[0] || !q[0].object) throw new Error('No hook target for '+subject+' found!');
	var target = q[0].object;

	var targets = {};

	var resources =
		{ 'http://magnode.org/HTTPRouter': router
		, db: input.db
		};
	render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/HTTPRouter_Instance']) throw new Error('HTTPRouter_Instance for '+subject+' could not be created');
		if(targets) targets['http://magnode.org/HTTPRouter_Instance']=r['http://magnode.org/HTTPRouter_Instance'];
		if(end) end();
	});

	var resources = { db: input.db };
	var resourceTypes = db.filter({subject:auth, predicate:"rdf:type"}).map(function(v){return v.object});
	for(var i=0;i<resourceTypes.length;i++) resources[resourceTypes[i]]=auth;
	render.render('http://magnode.org/AuthHTTP_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/AuthHTTP_Instance']) throw new Error('AuthHTTP_Instance for '+subject+' could not be created');
		if(targets) targets['http://magnode.org/AuthHTTP_Instance']=r['http://magnode.org/AuthHTTP_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/AuthHTTPCookie': target
		, db: input.db
		};
	render.render('http://magnode.org/AuthHTTPCookie_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/AuthHTTPCookie_Instance']) throw new Error('Cookie auth target <'+target+'> for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/AuthHTTPCookie_Instance']=r['http://magnode.org/AuthHTTPCookie_Instance'];
		if(end) end();
	});

	var end = function(){
		if(!targets) return;
		var required =
			[ 'http://magnode.org/HTTPRouter_Instance'
			, 'http://magnode.org/AuthHTTP_Instance'
			, 'http://magnode.org/AuthHTTPCookie_Instance'
			];
		if(!required.every(function(v){return targets[v];})) return;

		targets['http://magnode.org/AuthHTTPCookie_Instance'].routeSession(targets['http://magnode.org/HTTPRouter_Instance'], targets['http://magnode.org/AuthHTTP_Instance']);

		callback({"http://magnode.org/HTTPRouter_Hook":[]});
		targets = false;
	}
	if(end) end();
}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Hook_typeRouteAuthHTTPCookieStart";


