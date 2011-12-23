/*
Transform:HTTPServer_Instance_typeHTTPServer
	a view:ModuleTransform ;
	view:module "transform.HTTPServer_Instance_typeHTTPServer"
	view:range type:HTTPServer_Instance ;
	view:domain type:HTTPServer .
*/
module.exports = function(db, transform, input, render, callback){
	var routerResource = input.db.filter({subject:input['http://magnode.org/HTTPServer'],predicate:'http://magnode.org/router'}).map(function(v){return v.object});
	if(!routerResource[0]){
		callback(new Error('No router specified for '+input['http://magnode.org/HTTPServer']));
		return false;
	}

	var listenPort;
	var q = input.db.filter({subject:input['http://magnode.org/HTTPServer'],predicate:'http://magnode.org/listen'}).map(function(v){return v.object});
	if(q[0]){
		listenPort = q[0];
	}

	var resources =
		{ 'http://magnode.org/HTTPRouter': routerResource[0]
		, db: input.db
		};
	var router = render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r) throw new Error('Router for '+input['http://magnode.org/HTTPServer']+' could not be created');
		var server = require('http').createServer(r['http://magnode.org/HTTPRouter_Instance'].listener());
		if(listenPort){
			server.listen(listenPort);
			console.log('Opened HTTP server on port '+listenPort);
		}
		callback({"http://magnode.org/HTTPServer_Instance":server});
	})
}
module.exports.URI = "http://magnode.org/transform/HTTPServer_Instance_typeHTTPServer";
