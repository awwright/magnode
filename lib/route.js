var util = require('util');
var parseURL = require('url').parse;

module.exports = Route;
function Route(){
	this.routes = [];
}

// There's a few different types of routes:
// 1. RegExp or string match, and a "dispatch" property
// 2. function(req, cb) match, invokes callback with dispatch argument
// The dispatch object may be a static resource map, or a function(reqest,response)
// TODO: If multiple functions return resources, maybe combine them
// This would be good for returning resources based on namespace

Route.prototype.push = function push(event, callback){
	if(!event) throw new Error('Expected a Function or pattern for first argument');
	this.routes.push({test:event, dispatch:callback});
}

Route.prototype.route = function route(uri, cb){
	if(typeof uri != 'string'){
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
	function responseFor(route){
		remaining++;
		return function(err, matches){
			if(err || matches===null || matches===undefined){
				if(err) console.error(err.stack||err.toString());
			}else if(matches){
				answered.push(matches);
			}else{
				answered.push(route.dispatch);
			}
			result();
		}
	}
	/** Parallel query */
	for(var i=0;i<this.routes.length;i++){
		var route = this.routes[i];
		if(typeof route.test=="function"){
			route.test.call(this, uri, responseFor(route));
			continue;
		}
		var matches;
		if(route.test instanceof RegExp){
			matches = route.test.exec(parseURL(uri).pathname);
		}else if(typeof route.test=="object"){
			var parsed = parseURL(uri);
			if(route.test.path) matches = (route.test.path===parsed.pathname);
		}else if(typeof route.test=="string"){
			matches = (route.test==uri);
		}else{
			matches=route.test;
		}
		if(matches){
			answered.push(route.dispatch);
			return void result();
		}
	}
	result();
}
