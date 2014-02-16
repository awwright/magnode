/** Functions for using/starting up a daemon/application */

exports.require = function requireMagnode(n){
	// This might not be such a good idea,
	// But at least it should only be called at init-time
	return require('./'+n);
}

exports.Route = require('./route');
exports.Render = require('./render');

exports.startServers = function startServers(httpInterfaces, listener, callback){
	var listeners = [];
	var err;
	var httpWaiting = httpInterfaces.length;
	httpInterfaces.forEach(function(iface){
		var httpd = require('http').createServer(listener);
		httpd.listen(iface, ready);
		httpd.on('error', ready);
	});

	function ready(e){
		var httpd = this;
		if(e){
			err = e;
		}else if(httpd){
			listeners.push(httpd);
			var iface = httpd.address();
			if(typeof iface=='string'){
				console.log('HTTP server listening on unix socket '+iface);
			}else{
				var addr = (iface.address.indexOf(':')>=0)?('['+iface.address+']'):iface.address;
				console.log('HTTP server listening on '+iface.family+' '+addr+':'+iface.port);
			}
		}
		if(--httpWaiting!==0) return;
		callback(e, listeners);
	}
}

/** Get a list of directories of sample data, for install-time */
exports.getDistributions = function getDistributions(){
	var dir = __dirname+'/../setup/';
	return require('fs').readdirSync(dir).filter(function(v){
		return v.match(/^example-/);
	}).map(function(v){
		return require('path').resolve(dir,v);
	});
}
