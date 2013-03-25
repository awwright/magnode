/** Approve all actions by a defined superuser */

module.exports = function(superuser){
	this.superuser = superuser;
}

module.exports.prototype.test = function(user, actions, resources, callback){
	if(!user){
		var cred = resources['http://magnode.org/Auth'];
		if(!resources.request) throw new Error('No request resource');
		var auth = cred&&cred.authenticateRequest(resources.request);
		if(!auth) return void callback(false);
		user = auth.id;
	}
	callback(user && (user===this.superuser || user.id===this.superuser));
}
