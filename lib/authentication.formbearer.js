/*
Authenticate a user by an access_token field in a submitted form
*/

var crypto = require('crypto');
var querystring = require('querystring');

module.exports = function form(config, authz){
	this.authz = authz;
}

module.exports.prototype.test = function formTest(user, actions, resources, callback){
	if(!user) user=resources;
	var request = resources.request;
	if(!request) return void callback(false);
	this.authenticateRequest(resources.request, function(err, user){
		if(!user) return void callback(false);
		var userAuth = Object.create(user);
		userAuth.auth_token = user.secret;
		// Defer to the session
		authz.test(userAuth, actions, resources, callback);
	});
}

module.exports.prototype.authenticateRequest = function authenticateRequest(request, callback){
	if(!callback) callback=function(){};
	var postdata = '';
	var self=this;
	if(request.headers['content-type']!=='application/x-www-form-urlencoded'){
		return void callback(null);
	}else if(request.requestDataBuffer.end){
		return void parseData();
	}else{
		request.addListener('end', parseData);
	}
	function parseData(){
		var data = querystring.parse(request.requestDataBuffer.data);
		if(!data) return void callback(null);
		self.authz.authenticateToken(data.access_token, callback);
	}
}
