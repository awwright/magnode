// route.resource.mongodb.template.js
// e.g. routetemplate.route(route, resources, renders, "http://localhost/~{accountName}", "nodes", ['http://magnode.org/OnlineAccount']);

var resourceRouter = require('./route.mongodb');
var parseURL = require('url').parse;
var uritemplate = require('uri-templates');

module.exports = function(route, resources, renders, template, collectionName, resourceTypes, docSchema){
	var parser = uritemplate(template);
	return resourceRouter.create(function routeMongoDBSelfie(input, cb){
		var resource = input.requesturl;
		if(input.rdf && input.request && input.request.url && input.request.url.length>1){
			var curie = parseURL(input.request.url).pathname.substr(1);
			var expanded = input.rdf.resolve(curie);
			if(expanded) resource = expanded;
		}
		var where = parser.fromUri(resource);
		if(!where) return void cb(null);
		// Coerce values if necessary
		if(docSchema && docSchema.properties) for(var k in where){
			var s = docSchema.properties[k];
			if(s.type=='number') where[k] = parseFloat(where[k]);
			else if(s.type=='integer') where[k] = parseInt(where[k], 10);
		}
		var collection;
		if(input[collectionName] && input[collectionName].findOne) collection=input[collectionName];
		else collection=input['db-mongodb'].collection(collectionName);
		collection.findOne(where, function(err, node){
			if(err) return void cb(err);
			if(!node) return void cb(null);
			cb(null, node);
		});
	}, resourceTypes)(route, resources, renders);
};