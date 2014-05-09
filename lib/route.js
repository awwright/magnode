var util = require('util');
var parseURL = require('url').parse;

module.exports = Route;
function Route(){
	this.routes = [];
	this.Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');
}

// There's a few different types of routes:
// 1. RegExp or string match, and a "dispatch" property
// 2. function(req, cb) match, invokes callback with dispatch argument
// The dispatch object may be a static resource map, or a function(reqest,response)
// TODO: If multiple functions return resources, maybe combine them
// This is good for returning resources based on namespace

Route.prototype.push = function push(event, callback){
	if(!event) throw new Error('Expected a Function or pattern for first argument');
	this.routes.push({test:event, dispatch:callback});
}

Route.prototype.route = function route(req, cb){
	if(typeof req=='string'){
		var uri = req;
	}else{
		throw new Error('No URI provided');
	}
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
			matches = this.routes[i].test.exec(parseURL(uri).pathname);
		}else if(typeof this.routes[i].test=="object"){
			var parsed = parseURL(uri);
			if(this.routes[i].test.path) matches = (this.routes[i].test.path===parsed.pathname);
		}else if(typeof this.routes[i].test=="string"){
			matches = (this.routes[i].test==uri);
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
