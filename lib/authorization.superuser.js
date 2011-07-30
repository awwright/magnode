/** Approve all actions by a defined superuser */

module.exports = function(superuser){
	this.superuser = superuser;
}

module.exports.prototype.test = function(user, resource, callback){
	callback(user && (user==this.superuser || user.id==this.superuser));
}
