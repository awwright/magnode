/** Approve all actions by a defined superuser */

module.exports = function usergroupsMongoDB(superuser){
	this.superuser = superuser;
	this.accountType = 'http://magnode.org/OnlineAccount';
	this.groupType = 'http://magnode.org/MongoDBPermissionGroup';
}

module.exports.prototype.test = function usergroupsMongoDBTest(user, actions, resources, callback){
	var self = this;
	if(!user) user=resources;
	var session = user['http://magnode.org/UserSession'];
	var db = resources["db-mongodb"];
	if(!session || !session.id || !db){
		return void callback(false);
	}
	var types = session.groups;
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
		if(err){
			console.error(err.stack||err.toString());
			callback(false);
			return;
		}
		callback(authorized);
	});
}
