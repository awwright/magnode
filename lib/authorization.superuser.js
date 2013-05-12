/** Approve all actions by a defined superuser */

module.exports = function superuser(superuser){
	this.superuser = superuser;
}

module.exports.prototype.test = function superuserTest(user, actions, resources, callback){
	if(!user) user=resources;
	var auth = user.authentication;
	if(!auth) return void callback(false);
	callback(auth && (auth===this.superuser || auth.id===this.superuser));
}
