var util = require('util');
var parseURL = require('url').parse;

var route = module.exports = function(){
	this.routes = [];
	this.Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');
}

route.prototype.push = function(event, callback){
	this.routes.push({test:event, dispatch:callback});
}

route.prototype.route = function(req, res, cb){
	console.log('http.route route: '+req.url);
	var routes = this.routes;
	var answered = [];
	var safeMethods = {GET:true, HEAD:true, PROPGET:true};
	var requireOne = !safeMethods[req.method];
	var remaining = this.routes.length+1;
	function result(){
		if(remaining===false) return;
		if(--remaining===0){
			remaining=false;
			finish();
		}
	}
	function responseFor(i){
		return function(matches){
			if(matches===null){
				return void result();
			}else if(typeof matches=="function"){
				var dispatch = matches;
			}else{
				var dispatch = routes[i].dispatch;
			}
			if(!requireOne) dispatch(req, answered.length?null:res, matches);
			answered.push(dispatch);
			result();
		}
	}
	/** Parallel query */
	for(var i=0;i<this.routes.length;i++){
		if(typeof this.routes[i].test=="function"){
			this.routes[i].test.call(this, req, responseFor(i));
			continue;
		}
		var matches;
		if(this.routes[i].test instanceof RegExp){
			matches = this.routes[i].test.exec(parseURL(req.url).pathname);
		}else if(typeof this.routes[i].test=="string"){
			matches = (this.routes[i].test==req.url);
		}else{
			matches=this.routes[i].test;
		}
		if(matches===null || matches===false || matches===undefined){
			result();
			continue;
		}
		this.routes[i].dispatch.call(this, req, res, matches);
		answered.push(i);
		return void result();
	}
	result();
	function finish(){
		if(requireOne && answered.length>1){
			cb(new Error('Multiple routes declared their intent to handle a non-safe request'), null);
		}else{
			if(requireOne && answered.length) (answered[0])(req, res);
			cb(null, answered.length);
		}
	}
}

route.prototype.listener = function(){
	var self = this;
	return function(req, res){
		self.route(req, res, function(err, status){
			if(err){
				res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("500 Internal Server Error:\n"+status.toString());
			}else if(status===0){
				res.writeHead(404, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("404 Not Found:\nRoute error: No matching route for "+req.url+"\n\nRoutes:\n"+util.inspect(self.routes));
			}else if(!status){
				res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("500 Internal Server Error:\nRoute error: No response made?");
			}
			// Anything else means that the request will be written to
		});
	}
}
