/** Functions for using/starting up a daemon/application */

var fs = require('fs');

exports.require = function requireMagnode(n){
	// This might not be such a good idea,
	// But at least it should only be called at init-time
	return require('./'+n);
}

exports.Route = require('./route');
exports.Render = require('./render');
exports.rdf = require('rdf');

exports.startServers = function startServers(listener, httpInterfaces, callback){
	var listeners = [];
	var err;
	var httpWaiting = httpInterfaces.length;
	httpInterfaces.forEach(function(options){
		if(typeof options=='number'){
			var port = options;
			options = {};
		}else if(typeof options=='string'){
			var m = opt.match(/^(\[([0-9a-f:]+)\]|[0-9.]*)(:([0-9]+))?$/);
			var iface = m[2] || m[1];
			var port = parseInt(m[4]);
			options = {};
		}else{
			var iface = options.iface;
			var port = options.port;
			var sock = options.sock;
		}
		if(options.keyFile && !options.key){
			options.key = fs.readFileSync(options.keyFile, 'utf-8');
		}
		if(options.certFile && !options.cert){
			options.cert = fs.readFileSync(options.certFile, 'utf-8');
		}
		if(options.key && options.cert){
			var httpd = require('https').createServer(options);
		}else{
			var httpd = require('http').createServer();
		}
		httpd.on('request', listener);
		httpd.on('checkContinue', listener);
		if(iface) httpd.listen(port, iface, ready);
		else if(sock) httpd.listen(sock, ready);
		else httpd.listen(port, ready);
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
