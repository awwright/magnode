/** This is sort of a stop-gap measure until better a ACL module is written */

module.exports = function superuserMongoDB(db, superuser){
	this.db = db;
	this.superuser = superuser;
	this.accountType = 'http://magnode.org/OnlineAccount';
	this.groupType = 'http://magnode.org/Usergroup';
}

module.exports.prototype.test = function superuserMongoDBTest(user, actions, resources, callback){
	var self = this;var a=arguments;
	if(!user) user=resources;
	var session = user.authentication;
	if(!session || !session.id || !this.db){
		return void callback(false, '!prereq');
	}
	this.db.findOne({subject:session.id, type:this.accountType}, function(err, userDoc){
		if(err || !userDoc) return void callback(false);
		var userTypes = (userDoc.type instanceof Array)?userDoc.type:[];
		if(userTypes.indexOf(self.superuser)){
			return void callback(true);
		}else{
			return void callback(false, '!member');
		}
	});
}
