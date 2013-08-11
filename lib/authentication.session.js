/*
Authenticate a user by a session cookie they send to the server.

Allow the creation of a session cookie based off another authentication.
*/

module.exports = function session(session, authz){
	this.session = session;
	this.authz = authz;
}

module.exports.prototype.test = function sessionTest(user, actions, resources, callback){
	if(!user) user=resources;
	var authz = this.authz;
	this.session.authenticateToken(user._auth, function(err, info){
		if(err) return void callback(false);
		if(!info) return void callback(false);
		var userAuth = Object.create(user);
		userAuth.authentication = info;
		// The authentication data is authentic, now defer to the chain
		authz.test(userAuth, actions, resources, callback);
	});
}

module.exports.prototype.authenticateToken = function authenticateToken(token, callback){
	return this.session.authenticateToken(token, callback);
}

module.exports.prototype.createSession = function(user){
	return this.session.createSession(user);
}
