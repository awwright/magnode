var rdf=require('rdf');

var route = module.exports = function(router, resources, renders, url){
	router.push(url||{path:"/about:transforms"}, function(req, res){module.exports.process(req, res, renders.db);});
}

module.exports.process = function(request, response, db){
	function listProperty(title, list){
		if(list.length) response.write("\n\t"+title+": "+list.map(function(v){return v.toNT()}).join(","));
	}

	response.writeHead(200, {'Content-Type': 'text/plain'});
	var list = db.match(null, rdf.rdfns('type'), 'http://magnode.org/view/Transform').map(function(v){return v.subject});
	list.forEach(function(s){
		response.write(s);
		listProperty('Type', db.match(s, rdf.rdfns('type')).map(function(v){return v.object}));
		var domainFirst = db.match(s, 'http://magnode.org/view/domain').map(function(v){return v.object})[0];
		listProperty('Domain', db.getCollection(domainFirst));
		listProperty('Range', db.match(s, 'http://magnode.org/view/range').map(function(v){return v.object}) );
		listProperty('Inverse', db.match(s, 'http://magnode.org/view/inverse').map(function(v){return v.object}) );
		listProperty('Cachable', db.match(s, 'http://magnode.org/view/cache').map(function(v){return v.object}) );
		listProperty('Nice', db.match(s, 'http://magnode.org/view/nice').map(function(v){return v.object}) );
		response.write("\n\n");
	});
	response.end();
	return;
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/HTTPRouter_Hook_typeRouteAboutTransforms"
	, domain:"http://magnode.org/RouteAboutTransforms"
	, range:"http://magnode.org/HTTPRouter_Hook"
	, arguments:
		[ {type:"http://magnode.org/HTTPRouter_Instance",inputs:[{object:"$subject",predicate:"http://magnode.org/register",subject:"$result"}]}
		, {type:"literal",default:"/about:transforms"}
		]
	, construct:
		function(router){
			route(router);
			return [];
		}
	};
