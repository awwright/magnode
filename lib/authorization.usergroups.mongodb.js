/** Approve all actions by a defined superuser */

module.exports = function usergroupsMongoDB(superuser){
	this.superuser = superuser;
	this.accountType = 'http://magnode.org/OnlineAccount';
	this.groupType = 'http://magnode.org/Usergroup';
}

module.exports.prototype.test = function usergroupsMongoDBTest(user, actions, resources, callback){
	var self = this;
	if(!user) user=resources;
	var session = user.authentication;
	var db = user["db-mongodb-nodes"];
	if(!session || !session.id || !db){
		return void callback(false);
	}
	db.findOne({subject:session.id, type:this.accountType}, function(err, userDoc){
		if(err || !userDoc) return void callback(false);
		var authorized = false;
		var targetTypes = resources.node&&resources.node.type || [];
		var userTypes = (userDoc.type instanceof Array)?userDoc.type:[];
		var targetActions = Array.isArray(actions)?actions:[actions];
		for(var i=0; i<targetActions.length; i++) switch(targetActions[i]){
			case 'GET': targetActions.push('view'); break;
			case 'PUT': targetActions.push('edit'); break;
		}
		db.find({subject:{$in:userTypes},type:self.groupType,grant:{$exists:1}}).forEach(function(doc){
			if(!(doc.grant instanceof Array)) return;
			doc.grant.forEach(function(grant){
				if(!(grant.type instanceof Array) || !(grant.action instanceof Array)) return;
				function isEvery(v){if(v instanceof Array) return v.any(isAny); else return targetTypes.indexOf(v)>=0; }
				function isAny(v){if(v instanceof Array) return v.every(isEvery); else return targetTypes.indexOf(v)>=0; }
				if(!grant.type.every(isEvery)) return;
				if(grant.where && grant.where.length) return;
				if(!targetActions.every(function(v){ return grant.action.indexOf(v)>=0; })) return;
				authorized=true;
			});
		}, function(err){
			if(err){
				console.error(err.stack||err.toString());
				return void callback(false);
			}
			callback(authorized);
		});
	});
}
