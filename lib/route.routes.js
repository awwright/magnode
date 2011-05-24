var util = require('util');

module.exports = function(router){
	router.push("/about:routes", function(request, response){
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.write("Routes:\n\n");
		for(var i=0;i<router.routes.length;i++){
			response.write(router.routes[i][0]+"\n");
			response.write("\t"+util.inspect(router.routes[i][1])+"\n");
			response.write("\n");
		}
		response.end();
	});
}
