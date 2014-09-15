// Map a request URI to a MongoDB query on a collection
// e.g. routetemplate.route(route, resources, renders, "http://localhost/~{accountName}", "nodes", ['http://magnode.org/OnlineAccount']);

var resourceRouter = require('./route.mongodb');
var unescapeMongoObject = require('./mongoutils').unescapeObject;
var parseURL = require('url').parse;
var uritemplate = require('uri-templates');

module.exports = function(route, resources, renders, template, collectionName, resourceTypes, docSchema){
	var parser = uritemplate(template);
	function routeMongoDBSelfie(input, cb){
		var resource = input.resource;
		var where = parser.fromUri(input.resource);
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
			cb(null, unescapeMongoObject(node), resourceTypes);
		});
	}
	return resourceRouter.create(routeMongoDBSelfie)(route, resources, renders);
};
