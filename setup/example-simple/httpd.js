#!/usr/bin/env node

var httpInterfaces = [8080];

var magnode = require('magnode');
var rdf = require('rdf');
var route = new magnode.Route;
var renders = new magnode.Render;
var resources = {};

// Abolute URIs are made relative based upon the default prefix
// Set this to the main URL of your application
rdf.environment.setDefaultPrefix('http://localhost/');
// Named prefixes are used for resolving CURIEs in the path component of URLs
// e.g. http://example.com/magnode:Page becomes http://magnode.org/Page
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));

//resources["debugMode"] = true; // enables more verbose output to HTTP responses
resources["rdf"] = rdf.environment;

function routeIndex(resource, callback){
	var data;
	/* fetch `resource` from a data source */
	if(new rdf.IRI(resource).path()==='/'){
		// Match "/" on any authority or scheme
		data = 'Welcome to '+resource;
	}
	if(!data){
		// Nothing found
		return void callback();
	}
	var ret = {};
	ret[rdf.environment.resolve(':Published')] = data;
	ret['http://example.com/SomeResource'] = data;
	callback(null, ret);
}
route.push(routeIndex);

// These expose pages at /about:status /about:routes and /about:transforms
(magnode.require("route.status"))(route);
(magnode.require("route.routes"))(route);
(magnode.require("route.transforms"))(route, resources, renders);

function transform(db, transform, resources, render, callback){
	resources.response.setHeader('Content-Type', 'text/plain');
	resources.response.write('[[ Website Header ]]\n\n');
	resources.response.write(resources['http://example.com/SomeResource']);
	resources.response.write('\n\n[[ Website Footer ]]\n');
	resources.response.end();
	callback(null, {'http://magnode.org/HTTPResponse': 200});
}
transform.about = {
	id: 'http://example.com/transforms/HTTP_typeSomeResource',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
	domain: ['http://example.com/SomeResource'],
	range: ['http://magnode.org/HTTPResponse']
};
renders.add(transform, transform.about);

resources["authz"] = new (magnode.require("authorization.any"))(
	[ new (magnode.require("authorization.read"))(['get'], [rdf.environment.resolve(':Published')])
	, new (magnode.require("authorization.read"))(['get'], ['http://magnode.org/NotFound'])
	] );

var listener = magnode.require('http').createListener(route, resources, renders);
magnode.startServers(listener, httpInterfaces, function(err, interfaces){
	if(err){
		console.error(err.stack||err.toString());
		process.exit(2);
		return;
	}
	console.log('All ready');
});
