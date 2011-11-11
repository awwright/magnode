var util = require('util');

module.exports = function(router){
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
