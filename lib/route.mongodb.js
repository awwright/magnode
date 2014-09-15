// route.resource.mongodb.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var urlparse = require('url').parse;
var urlresolve = require('url').resolve;

var route = module.exports.create = function MongoDBRouter(query){
	return function registerHandler(route, resources, renders){
		function routeResource(resource, callback){
			// Work some bloom filter magic here?
			//if(filter.test(uri)===false){
			//	cb(null);
			//	return;
			//}
			// `resource` hasn't yet been assigned to `input`
			var input = Object.create(resources);
			input.resource = resource;
			query(input, function(err, node, types){
				if(err) return void callback(err);
				if(!node) return void callback(null);
				var result = {};
				if(types instanceof Array) types.forEach(function(v){ result[v] = node; });
				result.node = node;
				callback(null, result);
			});
		}
		route.push(routeResource);
	}
}
