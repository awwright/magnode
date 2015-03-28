var rdf=require('rdf');

var route = module.exports = function(router, resources, renders, url){
	router.push(url||{path:"/about:transforms.ttl"}, function routeAboutTransforms(req, res){module.exports.process(req, res, renders.db);});
}

module.exports.process = function(request, response, db){
	response.writeHead(200, {'Content-Type': 'text/turtle'});
	db.forEach(function(s){
		response.write(s.toString());
		response.write("\n");
	});
	response.end();
	return;
}
