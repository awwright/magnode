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
	var remaining = this.routes.length+1;
	function result(){
		if(remaining===false) return;
		if(--remaining===0){
			remaining=false;
			cb(null, answered);
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
		answered.push(this.routes[i].dispatch);
		return void result();
	}
	result();
}

route.prototype.listener = function(){
	var self = this;
	var safeMethods = {GET:true, HEAD:true, PROPGET:true};
	return function(req, res){
		var requireOne = !safeMethods[req.method];
		self.route(req, res, function(err, answers){
			if(err){
				res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("500 Internal Server Error:\n"+status.toString());
			}else if(requireOne && answers.length>1){
				res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("500 Internal Server Error:\nMultiple routes declared their intent to handle a non-safe request");
			}else if(answers && answers.length===0){
				res.writeHead(404, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("404 Not Found:\nRoute error: No matching route for "+req.url+"\n\nRoutes:\n"+util.inspect(self.routes));
			}else if(!answers){
				res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("500 Internal Server Error:\nRoute error: No response made?");
			}else{
				var dispatch = answers[0];
				if(typeof dispatch=='function'){
					dispatch(req, res);
				}else{
					// We've got our hands on a static resource, we need to format it
					res.writeHead(500, {'Content-Type': 'text/plain', 'Server':self.Server});
					res.end(util.inspect(dispatch));
				}
			}
		});
	}
}
