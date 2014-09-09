/*
Authenticate a user via a session cookie they send to the server.

routeSession creates a page which will send a Set-Cookie to a user who authenticates by other means, such as a username/password
(Or an access_token form field, for password resets)
*/

var crypto = require('crypto');

var relativeuri = require('./relativeuri');

module.exports = function cookie(config, sessionAuth){
	this.hmacHash = "SHA256";
	this.cookieName = config.cookieName || "authtoken";
	// 14 days is probably a sensible default
	this.cookieExpires = config.expires || 1000*60*60*24;
	this.secure = config.secure!==undefined ? config.secure : true ;
	var secret = config.secret || crypto.randomBytes(40);
	if(typeof secret=='string') secret=new Buffer(secret, 'binary');
	if(typeof secret.length!='number' || secret.length < 16) throw new Error("There's no way this secret key is secure");
	this.secret = function(){ return secret; };
	this.redirect = config.redirect || "/";
	this.session = sessionAuth;
}

module.exports.prototype.test = function cookieTest(user, actions, resources, callback){
	// Unless explictly marked all-access, Cookie and similar headers that are automatically send must not be non-safe
	var safe = {get:1, createtoken:1, displayLinkMenu:1};
	actions = Array.isArray(actions)?actions:[actions];
	// FIXME perhaps this should throw an error, if we would otherwise accept the action for a non-safe HTTP method?
	if(!actions.every(function(v){ return safe[v]; })) return void callback(false, 'cookie:http-unsafe');
	if(!user) user=resources;
	var request = user.request;
	if(!request) return void callback(false, 'cookie:!request');
	var session = this.session;
	var token = this.parseRequest(request);
	if(!token) return void callback(false, 'cookie:!token');
	var userAuth = Object.create(user);
	userAuth.auth_token = token;
	// Defer to the session
	session.test(userAuth, actions, resources, callback);
}

module.exports.prototype.parseRequest = function(request){
	if(!request || !request.headers || !request.headers.cookie) return;
	var cookies = request.headers.cookie.split(";");
	var token;
	for(var i=0;i<cookies.length;i++){
		var c=cookies[i].trim().split('=');
		if(c[0]===this.cookieName) token=c[1];
	}
	return token;
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

module.exports.prototype.createSession = function(user){
	var token = this.session.createSession(user, this.cookieExpires);
	var maxAge = Math.round((token.expires.valueOf()-new Date().valueOf())/1000);
	var header = this.cookieName+"="+token.secret.replace(/=/g,'')+"; expires="+token.expires.toUTCString()+"; max-age="+maxAge+"; path=/";
	if(this.secure) header += '; secure';
	return header;
}

module.exports.prototype.sessionGenerator = function(authenticator){
	var self = this;
	return function handleCreateSession(db, transform, resources, render, callback){
		var response = resources.response;
		authenticator.authenticateRequest(resources, function(err, user){
			if(user){
				response.statusCode = 303;
				response.setHeader("Location", relativeuri(resources.rdf, self.redirect));
				response.setHeader("Set-Cookie", self.createSession(user.id));
			}else{
				response.statusCode = 403;
				response.write("403 Forbidden\n\nAccess Denied.\n");
			}
			response.end();
			callback(null, {'http://magnode.org/HTTPResponse':response.statusCode});
		});
	};
}

module.exports.prototype.routeSession = function(router, authenticator, path){
	var self = this;
	path = path || authenticator.action || "/login";
	var handle = this.sessionGenerator(authenticator);
	router.push(path, {'http://magnode.org/Function':handle, 'http://magnode.org/Function_CreateSession':true});
}
