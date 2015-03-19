var util = require('util');

var route = module.exports = function(router){
	router.push({path:"/about:routes"}, function routeAboutRoutes(request, response){
		response.writeHead(200, {'Content-Type': 'text/plain'});
		//response.write(util.inspect(router.routes));
		for(var i=0;i<router.routes.length;i++){
			var route = router.routes[i].test;
			var dispatch = router.routes[i].dispatch;
			if(route.path) route = 'Path: '+route.path;
			else if(typeof route=='function' && dispatch===undefined){
				dispatch = route;
				route = 'Function:';
			}
			response.write(route+"\n");
			response.write(util.inspect(dispatch).replace(/^/gm,'\t')+"\n");
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
