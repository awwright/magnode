var rdf=require('rdf');

var resourceRouter = require('./route.resource');

module.exports.route = function registerHandler(route, resources, renders){
	var db = resources.db;
	if(!db) throw new Error('RDF graph does not exist');
	function routeResource(resource, callback){
		var nodeTypes = db.match(resource, rdf.rdfns("type"), null).map(function(v){return v.object;});
		if(!nodeTypes.length) return void callback();

		var result = {};
		nodeTypes.forEach(function(v){ result[v] = node; });
		callback(null, result);
	}
	route.push(routeResource);
}
