// route.resource.mongodb.subject.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.mongodb');
var unescapeMongoObject = require('./mongoutils').unescapeObject;
var parseURL = require('url').parse;

function routeMongoDBSubject(input, cb){
	var subject = input.resource.split('?',1)[0];
	input["db-mongodb-nodes"].findOne({subject:subject}, function(err, node){
		if(err) return void cb(err);
		if(!node) return void cb(null);
		if(node.targetCollection && node.targetId){
			input["db-mongodb"].collection(node.targetCollection).findOne({_id:node.targetId}, function(err, node){
				if(err) return void cb(err);
				if(!node) return void cb(null);
				cb(null, unescapeMongoObject(node), node.type);
			});
		}else{
			cb(null, unescapeMongoObject(node), node.type);
		}
	});
}

module.exports = resourceRouter.create(routeMongoDBSubject);
module.exports.routeMongoDBSubject = routeMongoDBSubject;
