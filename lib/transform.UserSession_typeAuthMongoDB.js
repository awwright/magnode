var accountType = "http://magnode.org/OnlineAccount";

module.exports = function(db, transform, input, render, callback){
	var cred = input['http://magnode.org/Auth'];
	var db = input["db-mongodb"];
	var auth = cred&&cred.authenticateRequest(input['request']);

	if(auth && auth.id && db){
		db.findOne({subject:auth.id, type:accountType}, userRecord);
	}else{
		return callback(false);
	}
	function userRecord(err, userDoc){
		if(err) return callback(err);
		if(!userDoc) return callback(false);

		var session = {};
		session.id = userDoc.subject;
		session._id = userDoc._id;
		session.subject = auth.id;
		session.username = userDoc.accountName||auth.username||u.id;
		session.accountName = userDoc.accountName||auth.username||u.id;
		session.fullName = userDoc.fullName||userDoc.name;
		session.email = userDoc.email;
		session.groups = userDoc.type;
		session.OnlineAccount = userDoc;
		callback(null, {"http://magnode.org/UserSession":session});
	}
}
module.exports.URI = "http://magnode.org/transform/UserSession_typeAuthMongoDB";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:Auth']}
	, 'view:range': 'type:UserSession'
	}
