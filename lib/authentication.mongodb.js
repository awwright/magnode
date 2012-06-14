/*
Validate a supplied username/password against an records in a database

Note the password may be kept in a seperate database/collection, the shadow.
Sensitive information should be kept in shadow, which would not get leaked if the main collection were dumped, or maliciously written to.
*/

module.exports = function(db, shadowDb, realm, methods){
	if(!db) throw new Error("credential.digest: Must provide a database");
	this.db = db;
	this.shadowDb = shadowDb;
	this.realm = realm||"";
	if(methods instanceof Array){
		var m = this.methods = {};
		methods.forEach(function(v){ m[v.hashName||v.name] = v; });
	}else{
		this.methods = methods;
	}
}

module.exports.prototype.authenticateCredential = function(credential, callback){
	var startTime = (new Date).getTime();
	function lengthyReturn(status){
		// FIXME We need some way of knowing the longest that a failed hash could take
		var waitDuration = 400;
		var endTime = (new Date).getTime();
		var waitRemaining = Math.max(0, startTime+waitDuration-endTime);
		setTimeout(function(){callback(status);}, waitRemaining);
	}

	var db = this.db;
	var shadowDb = this.shadowDb;
	var methods = this.methods;

	if((typeof credential.username)!="string" || (typeof credential.password)!="string"){
		return callback(false);
	}

	var query = {};
	if(this.realm) query.subject = this.realm+credential.username; // FIXME this needs a better way of looking up users
	else query.username = credential.username;
	db.findOne(query, function(err, doc){
		if(err){
			console.error(err);
			return lengthyReturn(false);
		}
		if(!doc){
			return lengthyReturn(false);
		}
		shadowDb.findOne({_id:doc._id}, function(err, shadow){
			if(err){
				console.error(err);
				return lengthyReturn(false);
			}
			if(!shadow){
				return lengthyReturn(false);
			}
			var parts = shadow.password.split(':');
			var comparePassword = methods[shadow.type];
			if((typeof comparePassword)!=='function'){
				return callback(false);
			}
			var record = {id:doc.subject, username:credential.username, realm:this.realm, type:shadow.type, password:shadow.password};
			comparePassword(record, credential, function(s){
				if(s===true) return callback({id:doc.subject, username:credential.username, realm:this.realm});
				return lengthyReturn(false);
			});
		});
	});
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/AuthPasswordMongo_New"
	, domain:"http://magnode.org/AuthPasswordMongo"
	, range:["http://magnode.org/AuthPasswordMongo_Instance","http://magnode.org/AuthPassword_Instance"]
	, arguments:
		[ {type:"http://magnode.org/DBMongoDB_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/realm",object:"$result"}, default:"user"}
		]
	, construct: function(db, realm){ return new module.exports(db, realm.toString()); }
	};