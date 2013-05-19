/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

var crypto = require('crypto');

module.exports = function cookie(config, session){
	this.hmacHash = "SHA256";
	this.cookieName = config.cookieName || "authtoken";
	// 14 days is probably a sensible default
	this.cookieExpires = config.expires || 1000*60*60*24;
	var secret = config.secret || crypto.randomBytes(40);
	if(typeof secret=='string') secret=new Buffer(secret, 'binary');
	if(typeof secret.length!='number' || secret.length < 16) throw new Error("There's no way this secret key is secure");
	this.secret = function(){ return secret; };
	this.redirect = config.redirect || "/";
	this.session = session;
}

module.exports.prototype.test = function cookieTest(user, actions, resources, callback){
	// Unless explictly marked all-access, Cookie and similar headers that are automatically send must not be non-safe
	var safe = {get:1, createtoken:1, displayLinkMenu:1};
	actions = Array.isArray(actions)?actions:[actions];
	if(!actions.every(function(v){ return safe[v]; })) return void callback(false);
	if(!user) user=resources;
	var request = resources.request;
	if(!request) return void callback(false);
	var session = this.session;
	var token = this.parseRequest(resources.request);
	if(!token) return void callback(false);
	var userAuth = Object.create(user);
	userAuth._auth = token;
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
	console.log('http.route.authentication.cookie successfully authenticated');
	var expires = this.session.expires();
	var token = this.session.createToken(user);
	return this.cookieName+"="+token.replace(/=/g,'')+"; expires="+expires.toUTCString()+"; path=/";
}

module.exports.prototype.routeSession = function(router, authenticator, path){
	var self=this;
	path = path || authenticator.action || "/login";
	router.push(path, function(request, response){
		authenticator.authenticateRequest(request, function(user){
			if(user){
				response.statusCode = 303;
				response.setHeader("Location", self.redirect);
				response.setHeader("Set-Cookie", self.createSession(user.id));
			}else{
				response.statusCode = 403;
				response.write("403 Forbidden\n\nAccess Denied.\n");
			}
			response.end();
		});
	});
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/AuthHTTPCookie_New"
	, domain:"http://magnode.org/AuthHTTPCookie"
	, range:["http://magnode.org/AuthHTTPCookie_Instance", "http://magnode.org/AuthHTTP_Instance"]
	, arguments:
		[ {type:"literal", default:null}
		]
	, construct:
		function(){
			return new module.exports(
				{ domain: "/"
				, redirect: "/?from=login"
				} );
		}
	};
