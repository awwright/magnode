/** Approve all actions by a defined superuser */

module.exports = function(superuser){
	this.superuser = superuser;
	this.accountType = 'http://magnode.org/OnlineAccount';
	this.groupType = 'http://magnode.org/MongoDBPermissionGroup';
}

module.exports.prototype.test = function(user, actions, resources, callback){
	var self = this;
	if(!user) user=resources['http://magnode.org/UserSession'];
	var db = resources["db-mongodb"];
	if(!user || !user.id || !db){
		return callback(false);
	}
	var types = user.groups;
	var authorized = false;
	var targetTypes = resources.node&&resources.node.type || [];
	var targetPermissions = Array.isArray(actions)?actions:[actions];
	targetPermissions.push('all');
	for(var i=0; i<actions.length; i++) switch(actions[i]){
		case 'GET': targetPermissions.push('view'); break;
		case 'PUT': case 'POST': targetPermissions.push('edit'); break;
	}
	resources['db-mongodb'].find({subject:{$in:types},type:self.groupType,grant:{$exists:1}}).forEach(function(doc){
		for(var i=0; i<targetTypes.length; i++){
			// escape %.$
			var type = targetTypes[i].replace(/%/g,'%25').replace(/\x2E/g, '%2E').replace(/\x24/g, '%24');
			if(!doc.grant[type]) continue;
			var permissions = (typeof doc.grant[type]=='string')?[doc.grant[type]]:doc.grant[type];
			for(var j=0; j<permissions.length; j++){
				if(targetPermissions.indexOf(permissions[j])!==-1){ authorized=true; return; }
			}
		}
	}, function(err){
		if(err) throw err;
		console.log("Returning callback auth=%j", authorized);
		callback(authorized);
	});
}
