var util = require('util');
var parseURL = require('url').parse;

var route = module.exports = function(){
	this.pre = [];
	this.routes = [];
	this.Server = 'Magnode Nodejs/'+process.version;
}

route.prototype = {};

route.prototype.register = function(){

}

route.prototype.push = function(event, callback){
	this.routes.push([event, callback]);
}

route.prototype.route = function(req, res, extraArgs){
	console.log('http.route route: '+req.url+' routes.length='+this.routes.length);
	for(var i=0;i<this.routes.length;i++){
		if(this.routes[i][0] instanceof RegExp){var matches = this.routes[i][0].exec(parseURL(req.url).pathname);}
		//else if(typeof(this.routes[i][0])=="string"){var matches = new RegExp(this.routes[i][0]).exec(parseURL(req.url).pathname);}
		else if(typeof(this.routes[i][0])=="string"){var matches = (this.routes[i][0]==req.url);}
		else {var matches = this.routes[i][0](parseURL(req.url).pathname, req);}
		if(matches===null || matches===false) continue;
		var args = [req, res, matches];
		if (Array.isArray(extraArgs)) args.concat(extraArgs);
		this.routes[i][1].apply(this, args);
		return true;
	}
	return false;
}

route.prototype.listener = function(){
	var self = this;
	return function(req, res){
		if(!self.route(req, res)){
			res.writeHead(404, {'Content-Type': 'text/plain', 'Server':self.Server});
			res.end("404 Not Found:\nRoute error: No matching route for "+req.url+"\n\nRoutes:\n"+util.inspect(self.routes));
		}
	}
}
