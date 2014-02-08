// route.resource.mongodb.subject.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.mongodb');
var parseURL = require('url').parse;

module.exports = resourceRouter.create(
	function routeMongoDBSubject(input, cb){
		var subject = input.resource.split('?',1)[0];
		input["db-mongodb-nodes"].findOne({subject:subject}, function(err, node){
			if(err) return void cb(err);
			if(!node) return void cb(null);
			cb(null, node);
		});
	}
);
