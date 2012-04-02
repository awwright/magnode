/*
Validate a supplied username/password against an Apache-style Digest record in a database
*/

var crypto = require('crypto');

module.exports = function(db, realm){
	if(!db) throw new Error("credential.digest: Must provide a database");
	this.db = db;
	this.realm = realm||"";
}

module.exports.authenticateCredential = function(db, credential, callback){
	if((typeof credential.username)!="string" || (typeof credential.realm)!="string" || (typeof credential.password)!="string"){
		return callback(false);
	}

	var query = {};
	if(credential.realm) query.subject = credential.realm+credential.username; // FIXME this needs a better way of looking up users
	else query.username = credential.username;
	db.findOne(query, function(err, doc){
		if(err){
			console.error(err);
			return callback(false);
		}
		if(!doc || !doc.password){
			return callback(false);
		}
		var parts = doc.password.split(':');
		if(parts[0]!='pbkdf2'){
			return callback(false);
		}
		var hash = Buffer(parts[3],'base64').toString();
		crypto.pbkdf2(credential.password, Buffer(parts[1],'base64'), parseInt(parts[2]), hash.length, function(err, pass){
			if(hash===pass) return callback({id:doc.subject, username:credential.username, realm:credential.realm});
			return callback(false);
		});
	});
}
module.exports.prototype.authenticateCredential = function(credential, callback){
	module.exports.authenticateCredential(this.db, {username:credential.username, realm:this.realm, password:credential.password}, callback);
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/AuthPasswordMongoPBKDF2_New"
	, domain:"http://magnode.org/AuthPasswordMongoPBKDF2"
	, range:["http://magnode.org/AuthPasswordMongoPBKDF2_Instance","http://magnode.org/AuthPassword_Instance"]
	, arguments:
		[ {type:"http://magnode.org/DBMongoDB_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/realm",object:"$result"}, default:"user"}
		]
	, construct: function(db, realm){ return new module.exports(db, realm.toString()); }
	};
