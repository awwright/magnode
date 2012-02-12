/*
Transform:HTTPServer_New
	a view:ModuleTransform ;
	view:module "transform.HTTPServer_New" ;
	view:domain type:HTTPServer ;
	view:range type:HTTPServer_Instance, type:Service_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/HTTPServer'];
	var routerResource = input.db.filter({subject:subject,predicate:'http://magnode.org/router'}).map(function(v){return v.object});
	if(!routerResource[0]){
		callback(new Error('No router specified for '+subject));
		return false;
	}

	var listenPort = 8080;
	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/listen'}).map(function(v){return v.object});
	if(q[0]){
		listenPort = q[0].value;
	}

	var resources =
		{ 'http://magnode.org/HTTPRouter': routerResource[0]
		, db: input.db
		};
	console.log('Creating HTTP server on port '+listenPort);
	render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/HTTPRouter_Instance']) throw new Error('HTTPRouter for '+subject+' could not be created: '+require('util').inspect(r));
		var server = require('http').createServer(r['http://magnode.org/HTTPRouter_Instance'].listener());
		if(listenPort){
			server.listen(listenPort);
			console.log('Opened HTTP server on port '+listenPort);
		}
		callback({'http://magnode.org/HTTPServer_Instance':server, 'http://magnode.org/Service_Instance':server});
	})
}
module.exports.URI = "http://magnode.org/transform/HTTPServer_New";
