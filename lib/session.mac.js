/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

var crypto = require('crypto');

module.exports = function session(config){
	this.hmacHash = "SHA256";
	// 14 days is probably a sensible default
	this.expireDuration = config.expires || 1000*60*60*24;
	var secret = config.secret || crypto.randomBytes(40);
	if(typeof secret=='string') secret=new Buffer(secret, 'binary');
	if(typeof secret.length!='number' || secret.length < 16) throw new Error("There's no way this secret key is secure");
	this.secret = function(){ return secret; };
}

module.exports.prototype.authenticateToken = function authenticateToken(token, callback){
	if(!token) return void callback(null);
	var tokenParts = token.split('.');
	if(tokenParts.length!=2) return void callback(null);
	var body = new Buffer(tokenParts[1], 'base64');
	// verify contents
	var hash = crypto.createHmac(this.hmacHash, this.secret());
	hash.update(body);
	var z = hash.digest("base64");
	if(z.replace(/=/g,'')!==tokenParts[0]) return void callback(null);

	var expires = 0;
	for(var i=0;i<8;i++){expires=body[i]+expires*256;}
	if(new Date().getTime()>expires) return void callback(null);

	var user = body.slice(8).toString('utf8');

	// Calculate session id
	var hash = crypto.createHash(this.hmacHash);
	hash.update(body);
	var sessionid = hash.digest("base64").replace(/=/g,'');

	var info = {id:user, expires:new Date(expires), session:sessionid, token:token};
	callback(null, info);
}

module.exports.prototype.secret = function(){}

module.exports.expires = function(seconds){
	return new Date(new Date().valueOf() + seconds);
}

module.exports.prototype.expires = function(seconds){
	return module.exports.expires(this.expireDuration);
}

module.exports.prototype.createSession = function(user){
	var expires = this.expires();
	var body=new Buffer("\0\0\0\0\0\0\0\0"+user, 'utf-8');
	var e=expires.valueOf();
	// 64-bit date
	for(var i=0;i<8;i++){body[7-i]=e&0xFF; e=Math.floor(e/256);}
	var hash = crypto.createHmac(this.hmacHash, this.secret());
	hash.update(body);
	var token = (hash.digest("base64")+"."+body.toString('base64')).replace(/=/g,'');
	var hash = crypto.createHash('sha256');
	hash.update(token);
	var id = hash.digest('base64');
	return {id:id, expires:expires, secret:token};
}
