/*
Transform:HTTPRouter_Hook_typeMongoDBRender
	a view:ModuleTransform ;
	view:module "magnode/transform.HTTPRouter_Hook_typeMongoDBRender" ;
	view:domain type:MongoDBRender ;
	view:range type:HTTPRouter_Hook .
*/
var route_resource_mongodb = require("magnode/route.resource.mongodb").route;
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/MongoDBRender'];

	var q = input.db.filter({object:subject, predicate:'http://magnode.org/register'});
	if(!q[0] || !q[0].object) throw new Error('No router for <'+subject+'> found!');
	var router = q[0].subject;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/db'});
	if(!q[0] || !q[0].object) throw new Error('No database for <'+subject+'> given!');
	var renderdb = q[0].object;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/render'});
	if(!q[0] || !q[0].object) throw new Error('No render for <'+subject+'> found!');
	var renders = q[0].object;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/target'});
	if(!q[0] || !q[0].object) throw new Error('No hook target for <'+subject+'> found!');
	var target = q[0].object;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/base'});
	if(!q[0] || !q[0].object) throw new Error('No base for <'+subject+'> found!');
	var base = q[0].object;

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/auth'});
	if(!q[0] || !q[0].object) throw new Error('No auth for <'+subject+'> found!');
	var auth = q[0].object;

	var targets = {};

	var resources =
		{ 'http://magnode.org/HTTPRouter': router
		, db: input.db
		};
	render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/HTTPRouter_Instance']) throw new Error('HTTPRouter_Instance for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/HTTPRouter_Instance']=r['http://magnode.org/HTTPRouter_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/DBMongoDB': renderdb
		, db: input.db
		};
	render.render('http://magnode.org/DBMongoDB_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/DBMongoDB_Instance']) throw new Error('DBMongoDB_Instance for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/DBMongoDB_Instance']=r['http://magnode.org/DBMongoDB_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/AuthHTTPForm': target
		, db: input.db
		};
	render.render('http://magnode.org/AuthHTTPForm_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/AuthHTTPForm_Instance']) throw new Error('AuthHTTPForm_Instance for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/AuthHTTPForm_Instance']=r['http://magnode.org/AuthHTTPForm_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/Render': renders
		, db: input.db
		};
	render.render('http://magnode.org/Render_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/Render_Instance']) throw new Error('Render <'+renders+'> for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/Render_Instance']=r['http://magnode.org/Render_Instance'];
		if(end) end();
	});

	var resources = { db: input.db };
	var resourceTypes = db.filter({subject:auth, predicate:"rdf:type"}).map(function(v){return v.object});
	for(var i=0;i<resourceTypes.length;i++) resources[resourceTypes[i]]=auth;
	render.render('http://magnode.org/AuthHTTP_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/AuthHTTP_Instance']) throw new Error('AuthHTTP <'+renders+'> for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/AuthHTTP_Instance']=r['http://magnode.org/AuthHTTP_Instance'];
		if(end) end();
	});

	var end = function(){
		if(!targets) return;
		var required =
			[ 'http://magnode.org/HTTPRouter_Instance'
			, 'http://magnode.org/DBMongoDB_Instance'
			, 'http://magnode.org/AuthHTTPForm_Instance'
			, 'http://magnode.org/Render_Instance'
			, 'http://magnode.org/AuthHTTP_Instance'
			];
		if(!required.every(function(v){return targets[v];})) return;

		var httpAuthCookie = {};
		var authz = {};

		targets['db-mongodb'] = targets['http://magnode.org/DBMongoDB_Instance'];
		route_resource_mongodb(targets['http://magnode.org/HTTPRouter_Instance'], targets, httpAuthCookie, authz, targets['http://magnode.org/Render_Instance'], base);

		callback({"http://magnode.org/HTTPRouter_Hook":[]});
		targets = false;
	}
	if(end) end();

}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Instance_typeHTTPRouter";
