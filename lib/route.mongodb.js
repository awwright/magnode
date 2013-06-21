// route.resource.mongodb.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var urlparse = require('url').parse;
var urlresolve = require('url').resolve;

var route = module.exports.create = function MongoDBRouter(query){
	return function registerHandler(route, resources, renders){
		var prefix = resources.rdf&&resources.rdf.prefixes[''] || "";
		function routeResource(req, callback){
			// Work some bloom filter magic here?
			//if(filter.test(uri)===false){
			//	cb(null);
			//	return;
			//}
			var input = Object.create(resources);
			input.request = req;
			input.requesturl = urlresolve(prefix, urlparse(input.request.url).pathname);
			query(input, function(err, node){
				if(err) return void callback(err);
				if(!node) return void callback(null);
				var result = {};
				if(node.type instanceof Array) node.type.forEach(function(v){ result[v] = node; });
				result.node = node;
				callback(null, result);
			});
		}
		route.push(routeResource);
	}
}
