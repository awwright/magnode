/** Approve all actions by a defined superuser */

module.exports = function(superuser){
	this.superuser = superuser;
}

module.exports.prototype.test = function(user, actions, resources, callback){
	if(!user) user=resources['http://magnode.org/UserSession'];
	callback(user && (user==this.superuser || user.id==this.superuser));
}
