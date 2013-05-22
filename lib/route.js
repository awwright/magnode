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
	console.log('http.route route: '+req.url+' routes.length='+this.routes.length);
	var answered = false;
	var remaining = this.routes.length;
	function failed(i){
		if(remaining===false) return;
		if(--remaining===0){
			remaining=false;
			cb(false);
		}
	}
	/** Parallel query */
	for(var i=0;i<this.routes.length;i++){
		function responseFor(i){
			return function(matches){
				// FIXME why isn't this undefined? false shouldn't be used like this
				if(matches===null || matches===false){
					failed(i);
					return;
				}
				var dispatch = (typeof matches=="function")&&matches||this.routes[i].dispatch;
				dispatch(req, answered?false:res, matches);
				answered = true;
				cb(true);
			}
		}
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
			failed(i);
			continue;
		}
		answered = true;
		this.routes[i].dispatch.call(this, req, res, matches);
		cb(true);
		return;
	}
	if(remaining===0) cb(false);
}

route.prototype.listener = function(){
	var self = this;
	return function(req, res){
		self.route(req, res, function(status){
			if(!status){
				res.writeHead(404, {'Content-Type': 'text/plain', 'Server':self.Server});
				res.end("404 Not Found:\nRoute error: No matching route for "+req.url+"\n\nRoutes:\n"+util.inspect(self.routes));
			}
		});
	}
}
