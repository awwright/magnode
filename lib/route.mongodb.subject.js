// route.resource.mongodb.subject.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.mongodb');
var parseURL = require('url').parse;

module.exports = resourceRouter.create(
	function routeMongoDBSubject(input, cb){
		var resource = input.requesturl;
		if(input.rdf && input.request && input.request.url && input.request.url.length>1){
			var curie = parseURL(input.request.url).pathname.substr(1);
			var expanded = input.rdf.resolve(curie);
			if(expanded) resource = expanded;
		}
		input["db-mongodb-nodes"].findOne({subject:resource}, function(err, node){
			if(err) return void cb(err);
			if(!node) return void cb(null);
			cb(null, node);
		});
	}
);
