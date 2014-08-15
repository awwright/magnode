/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

module.exports = function SessionAuthentication(sessionStore, authz){
	if(!sessionStore) throw new Error('No session store provided');
	if(!authz) throw new Error('No authorization tester provided');
	this.sessionStore = sessionStore;
	this.authz = authz;
}

module.exports.prototype.test = function sessionTest(user, actions, resources, callback){
	if(!user) user=resources;
	var authz = this.authz;
	var token = user.auth_token || user.access_token;
	this.sessionStore.authenticateToken(token, function(err, info){
		if(err) return void callback(false, "sessionStore.authenticateToken:err");
		if(!info) return void callback(false, "sessionStore.authenticateToken:!info");
		var userAuth = Object.create(user);
		userAuth.authentication = info;
		// The authentication data is authentic, now defer to the chain
		authz.test(userAuth, actions, resources, callback);
	});
}

module.exports.prototype.authenticateToken = function authenticateToken(token, callback){
	return this.sessionStore.authenticateToken(token, callback);
}

module.exports.prototype.authenticateCredential = function authenticateCredential(data, callback){
	return this.sessionStore.authenticateToken(data.access_token, callback);
}

module.exports.prototype.createSession = function(user){
	return this.sessionStore.createSession(user);
}
