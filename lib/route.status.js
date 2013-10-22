var util = require('util');

module.exports = function(router, url){
	router.push(url||{path:"/about:status"}, processRequest);
}

function processRequest(request, response){
	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.write("Node.js Version: ");
	response.write(JSON.stringify(process.version));
	response.write("\n\n");
	response.write("Memory: ");
	response.write(JSON.stringify(process.memoryUsage())+"\n");
	var meminfo = process.memoryUsage();
	for(k in meminfo){
		response.write(("          "+k).substr(-10) + ": " + ("        "+(meminfo[k]>>10)).substr(-8) + " KiB\n");
		//response.write(("          "+k).substr(-10)+": "+(meminfo[k]>>20)+" MiB\n");
	}
	response.write("\n\n");
	response.write("Request Headers:\n");
	response.write(util.inspect(request));
	response.write("\n\n");
	response.end();
}
module.exports.processRequest = processRequest;

module.exports.generate =
	{ "@id":"http://magnode.org/transform/HTTPRouter_Hook_typeRouteAboutStatus"
	, domain:"http://magnode.org/RouteAboutStatus"
	, range:"http://magnode.org/HTTPRouter_Hook"
	, arguments:
		[ {type:"http://magnode.org/HTTPRouter_Instance",inputs:[{object:"$subject",predicate:"http://magnode.org/register",subject:"$result"}]}
		, {type:"literal",default:"/about:status"}
		]
	, construct:
		function(router){
			module.exports(router);
			return [];
		}
	};
