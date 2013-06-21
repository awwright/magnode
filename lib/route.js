var util = require('util');
var parseURL = require('url').parse;

var route = module.exports = function(){
	this.routes = [];
	this.Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');
}

// There's a few different types of routes:
// 1. RegExp or string match, and a "dispatch" property
// 2. function(req, cb) match, returns the dispatch resource
// The dispatch resource may be a static resource map, or a function(reqest,response)

route.prototype.push = function(event, callback){
	this.routes.push({test:event, dispatch:callback});
}

route.prototype.route = function(req, cb){
	console.log('http.route route: '+req.url);
	var routes = this.routes;
	var answered = [];
	var remaining = 1;
	function result(){
		if(remaining===false) return;
		if(--remaining===0){
			remaining=false;
			cb(null, answered);
		}
	}
	function responseFor(i){
		remaining++;
		return function(err, matches){
			if(err || matches===null || matches===undefined){
				if(err) console.error(err.stack||err.toString());
			}else if(matches){
				answered.push(matches);
			}else{
				answered.push(routes[i].dispatch);
			}
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
		if(matches){
			answered.push(this.routes[i].dispatch);
			return void result();
		}
	}
	result();
}
