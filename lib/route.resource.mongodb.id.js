// route.resource.mongodb.id.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.resource.mongodb');
var ObjectId = require('mongolian').ObjectId;

module.exports = resourceRouter.create(
	function routeMongoDBid(input, cb){
		var objectid = input.request.url.match(/\/ObjectId\(([0-9a-f]{24})\)/);
		if(!objectid) return void cb(false);
		input["db-mongodb"].findOne({_id:new ObjectId(objectid[1])}, function(err, node){
			if(!node) return void cb(false);
			cb(node);
		});
	}
);
