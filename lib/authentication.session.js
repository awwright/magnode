/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

var crypto = require('crypto');

module.exports = function session(config, authz){
	this.hmacHash = "SHA256";
	this.cookieName = config.cookieName || "authtoken";
	// 14 days is probably a sensible default
	this.expireDuration = config.expires || 1000*60*60*24;
	var secret = config.secret || crypto.randomBytes(40);
	if(typeof secret=='string') secret=new Buffer(secret, 'binary');
	if(typeof secret.length!='number' || secret.length < 16) throw new Error("There's no way this secret key is secure");
	this.secret = function(){ return secret; };
	this.redirect = config.redirect || "/";
	this.authz = authz;
}

module.exports.prototype.test = function sessionTest(user, actions, resources, callback){
	if(!user) user=resources;
	var authz = this.authz;
	this.authenticateToken(user._auth, function(err, info){
		if(err) return void callback(false);
		if(!info) return void callback(false);
		var userAuth = Object.create(user);
		userAuth.authentication = info;
		// The authentication data is authentic, now defer to the chain
		authz.test(userAuth, actions, resources, callback);
	});
}

module.exports.prototype.authenticateToken = function authenticateToken(token, callback){
	if(!token) return void callback(null);
	var tokenParts = token.split('.');
	if(tokenParts.length!=2) return void callback(null);
	var body = new Buffer(tokenParts[1], 'base64');
	// verify contents
	var hash = crypto.createHmac(this.hmacHash, this.secret());
	hash.update(body);
	if(hash.digest("base64").replace(/=/g,'')!==tokenParts[0]) return void callback(null);

	var expires = 0;
	for(var i=0;i<8;i++){expires=body[i]+expires*256;}
	if(new Date().getTime()>expires) return void callback(null);

	var user = body.slice(8).toString('utf8');

	var info = {id:user, expires:new Date(expires), token:token};
	callback(null, info);
}

module.exports.prototype.secret = function(){}

module.exports.expires = function(seconds){
	return new Date(new Date().getTime() + seconds);
}

module.exports.prototype.expires = function(seconds){
	return module.exports.expires(this.expireDuration);
}

module.exports.prototype.createToken = function(user){
	var expires = this.expires();
	var body=Buffer("\0\0\0\0\0\0\0\0"+user);
	var e=expires.getTime();
	// 64-bit date
	for(var i=0;i<8;i++){body[7-i]=e&0xFF; e=Math.floor(e/256);}
	// TODO: use a secret specific to the user, that way a session can be revoked.
	var hash = crypto.createHmac(this.hmacHash, this.secret());
	hash.update(body);
	var token = hash.digest("base64")+"."+body.toString('base64');
	return token;
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
