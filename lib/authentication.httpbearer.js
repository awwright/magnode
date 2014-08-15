/*
Authenticate a user via an OAuth-style Authorization: Bearer request header
*/

var crypto = require('crypto');

module.exports = function httpbearer(config, session){
	this.session = session;
}

module.exports.prototype.test = function bearerTest(user, actions, resources, callback){
	actions = Array.isArray(actions)?actions:[actions];
	if(!user) user=resources;
	var request = resources.request;
	if(!request) return void callback(false, 'httpbearer:!request');
	var session = this.session;
	var token = this.parseRequest(resources.request);
	if(!token) return void callback(false, 'httpbearer:!token');
	var userAuth = Object.create(user);
	userAuth.auth_token = token;
	// Defer to the session
	session.test(userAuth, actions, resources, callback);
}

module.exports.prototype.parseRequest = function(request){
	if(!request || !request.headers || !request.headers.authorization) return;
	var h = request.headers.authorization;
	if(typeof h!='string') return;
	var parts = h.match(/^Bearer +([a-zA-Z0-9\-\._~\+/=]+)$/);
	if(!parts) return;
	return parts[1];
}

module.exports.prototype.authenticateRequest = function(request, callback){
	//if(request.CookieAuth!==undefined) return void callback(request.CookieAuth);
	if(!callback) callback=function(){};
	var token = this.parseRequest(request);
	if(!token) return void callback(null);
	this.session.authenticateToken(token, function(err, info){
		//request.CookieAuth = info || null;
		callback(err, info);
	});
}
