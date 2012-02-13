/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

var crypto = require('crypto');

module.exports = function(config){
	this.config = config;
	this.hmacHash = "SHA256";
	this.cookieName = config.cookieName || "authtoken";
	// 14 days is probably a sensible default
	this.cookieExpires = config.expires || 1000*60*60*24;
	this.secret = config.secret || (function(){var a=Buffer(40); for(var i=0;i<a.length;i++) a[i]^=(Math.random()*0xff&0xff); return a;})();
	this.redirect = config.redirect || "/";
}

module.exports.prototype.authenticateRequest	= function(request, callback){
	if(!callback) callback=function(){};
	if(!request.headers || !request.headers.cookie){ callback(null); return false; }
	var cookies = request.headers.cookie.split(";");
	var token;
	for(var i=0;i<cookies.length;i++){
		var c=cookies[i].trim().split('=');
		if(c[0]==this.cookieName) token=decodeURIComponent(c[1]);
	}
	if(!token) return false;
	token = token.split('.');
	if(token.length!=2) return false;
	var body = new Buffer(token[1], 'base64');
	// verify contents
	var hash = crypto.createHmac(this.hmacHash, this.secret);
	hash.update(body);
	if(hash.digest("hex")!==token[0]) return false;

	var expires = 0;
	for(var i=0;i<8;i++){expires=body[i]+expires*256;}
	if(new Date().getTime()>expires) return false;

	var user = body.slice(8).toString('utf8');

	var info = {id:user, expires:new Date(expires), token:c[1]};
	callback(info);
	return info;
}

module.exports.expires = function(seconds){
	return new Date(new Date().getTime() + seconds);
}

module.exports.prototype.expires = function(seconds){
	return module.exports.expires(this.cookieExpires);
}

module.exports.prototype.createSession = function(user){
	console.log('http.route.authentication.cookie successfully authenticated');
	var expires = this.expires();
	var body=Buffer("\0\0\0\0\0\0\0\0"+user);
	var e=expires.getTime();
	// 64-bit date
	for(var i=0;i<8;i++){body[7-i]=e&0xFF; e=Math.floor(e/256);}
	// TODO: use a secret specific to the user, that way a session can be revoked.
	var hash = crypto.createHmac(this.hmacHash, this.secret);
	hash.update(body);
	// Hex because it produces a constant-length string, everything after the hash can be base64
	var token=hash.digest("hex")+"."+body.toString('base64');
	return this.cookieName+"="+encodeURIComponent(token)+"; expires="+expires.toUTCString()+"; path=/";
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
