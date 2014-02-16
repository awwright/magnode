var magnode = require('magnode');

var httpInterfaces = [8080];

var route = new magnode.Route;

function routeThing(resource, callback){
	/* fetch `resource` from a data source */
	var data = 'Resource: '+resource;
	var ret = {};
	ret[rdf.environment.resolve(':Published')] = data;
	ret['http://example.com/SomeResource'] = data;
	callback(null, ret);
}

route.push(routeThing);

var rdf = require('rdf');
var transformDb = new rdf.TripletGraph;

// The default prefix is used for defaulty-things sorta
rdf.environment.setDefaultPrefix('http://localhost/');
// Named prefixes are used for resolving CURIEs in the path component of URLs e.g. http://example.com/magnode:Page
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));

var resources = {};
//resources["debugMode"] = true;
resources["rdf"] = rdf.environment;

function transform(db, transform, resources, render, callback){
	resources.response.setHeader('Content-Type', 'text/plain');
	resources.response.write('Have Resource:\n');
	resources.response.end(resources['http://example.com/SomeResource']);
	callback(null, {'http://magnode.org/HTTPResponse': 200});
}
transform.about = {
	id: 'http://example.com/transforms/HTTP_typeSomeResource',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
	domain: ['http://example.com/SomeResource'],
	range: ['http://magnode.org/HTTPResponse']
};

var renders = new magnode.Render(transformDb, []);
renders.add(transform, transform.about);

resources["authz"] = new (magnode.require("authorization.any"))(
	[ new (magnode.require("authorization.read"))(['get'], [rdf.environment.resolve(':Published')])
	, new (magnode.require("authorization.read"))(['get'], ['http://magnode.org/NotFound'])
	] );

var listener = magnode.require('http').createListener(route, resources, renders);
magnode.startServers(httpInterfaces, listener, function(err, interfaces){
	if(err){
		console.error(err.stack||err.toString());
		process.exit(2);
		return;
	}
	console.log('All ready');
});
