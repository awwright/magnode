var util = require('util');

var route = module.exports = function(router, resources, renders, url){
	router.push(url||"/about:transforms", function(req, res){module.exports.process(req, res, renders.db);});
}

module.exports.process = function(request, response, db){
	function listProperty(predicate, title){
		if(!db.indexPSO[predicate] || !db.indexPSO[predicate][s]) return;
		var list = Object.keys(db.indexPSO[predicate][s]);
		if(list.length) response.write("\n\t"+title+": "+list.map(function(v){return "<"+v+">"}).join(","));
	}

	response.writeHead(200, {'Content-Type': 'text/plain'});
	var list = db.indexOPS['http://magnode.org/view/Transform']['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'];
	for(var s in list){
		response.write(s);
		listProperty('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'Type');
		listProperty('http://magnode.org/view/domain', 'Domain');
		listProperty('http://magnode.org/view/range', 'Range');
		listProperty('http://magnode.org/view/inverse', 'Inverse');
		response.write("\n\n");
	}
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
