var util = require('util');

var route = module.exports = function(router){
	router.push("/about:routes", function(request, response){
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.write("Routes:\n\n");
		//response.write(util.inspect(router.routes));
		for(var i=0;i<router.routes.length;i++){
			response.write(router.routes[i].test+"\n");
			response.write("\t"+util.inspect(router.routes[i].dispatch)+"\n");
			response.write("\n");
		}
		response.end();
	});
}
module.exports.generate =
	{ "@id":"http://magnode.org/transform/HTTPRouter_Hook_typeRouteAboutRoutes"
	, domain:"http://magnode.org/RouteAboutRoutes"
	, range:"http://magnode.org/HTTPRouter_Hook"
	, arguments:
		[ {type:"http://magnode.org/HTTPRouter_Instance", inputs:[{object:"$subject",predicate:"http://magnode.org/register",subject:"$result"}]}
		, {type:"literal", default:null}
		]
	, construct: function(router){ route(router); return []; }
	};
