var util = require('util');

module.exports = function(router, url){
	router.push(url||"/about:status", arguments.callee.process);
}

module.exports.process = function(request, response){
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
	return;
}
