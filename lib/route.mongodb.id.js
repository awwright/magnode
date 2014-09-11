// route.resource.mongodb.id.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.mongodb');
var unescapeMongoObject = require('./mongoutils').unescapeObject;
var ObjectId = require('mongodb').ObjectID;

module.exports = resourceRouter.create(
	function routeMongoDBid(input, cb){
		var objectid = input.resource.match(/\/ObjectId\(([0-9a-f]{24})\)/);
		if(!objectid) return void cb(null);
		input["db-mongodb-nodes"].findOne({_id:new ObjectId(objectid[1])}, function(err, node){
			if(err) return void cb(err);
			if(!node) return void cb(null);
			cb(null, unescapeMongoObject(node));
		});
	}
);
