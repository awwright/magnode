/*
Authenticate a user via an OAuth-style Authorization: Bearer request header
*/

module.exports = function httpbearer(config, authz){
	this.realm = config.realm || 'Origin';

	this.config = config;
	this.credentials = config.credentials;
	this.action = config.action;
	this.authz = authz;
}

module.exports.prototype.test = function bearerTest(user, actions, resources, callback){
	actions = Array.isArray(actions)?actions:[actions];
	if(!user) user=resources;
	var request = resources.request;
	if(!request) return void callback(false);
	var authz = this.authz;
	this.authenticateRequest(request, function(err, userInfo){
		if(userInfo && userInfo.id){
			// Great, we authenticated, now defer to the authorizer
			authz.test(user, actions, resources, callback);
		}else{
			return void callback(false);
		}
	});
}

module.exports.prototype.parseRequest = function(request){
	if(!request || !request.headers || !request.headers.authorization) return;
	var h = request.headers.authorization;
	if(typeof h!='string') return;
	var parts = h.match(/^Basic +([a-zA-Z0-9\-\._~\+/=]+)$/);
	if(!parts) return;
	var buf = new Buffer(parts[1], 'base64').toString();
	var username = buf.split(':',1)[0];
	var password = buf.substring(username.length+1);
	return {username:username, password:password};
}

// TODO PBKDF2 is expensive - add some sort of caching for the second and additional times this is called
module.exports.prototype.authenticateRequest = function(request, callback){
	// Cache the results of authetnication - FIXME enable this
	// if(request.HTTPBasicAuth!==undefined) return void callback(request.HTTPBasicAuth);
	if(!callback) callback=function(){};
	var token = this.parseRequest(request);
	if(!token) return void callback(null);
	this.credentials.authenticateCredential(token, callback);
};
