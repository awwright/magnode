/*
Validate a supplied username/password against an records in a database

Note the password may be kept in a seperate database/collection, the shadow.
Sensitive information should be kept in shadow, which would not get leaked if the main collection were dumped, or maliciously written to.
*/

function ShadowStore(db, shadowDb, realm, methods){
	if(!db) throw new Error("credential.digest: Must provide a database");
	this.db = db;
	this.shadowDb = shadowDb;
	this.realm = realm;
	this.accountType = "http://magnode.org/OnlineAccount";
	if(methods instanceof Array){
		var m = this.methods = {};
		methods.forEach(function(v){ m[v.hashName||v.name] = v; });
	}else{
		this.methods = methods;
	}
}
module.exports = ShadowStore;

ShadowStore.prototype.authenticateCredential = function authenticateCredential(credential, callback){
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
		return void callback(null);
	}

	var query = {type:this.accountType, subject:{$exists:true}};
	if(this.realm) query.subject = this.realm+credential.username;
	else query.accountName = credential.username;
	db.findOne(query, function(err, doc){
		if(err){
			console.error(err.stack||err.toString());
			return void lengthyReturn(null);
		}
		if(!doc || !doc.password){
			return void lengthyReturn(null);
		}
		shadowDb.findOne({_id:doc.password}, function(err, shadow){
			if(err){
				console.error(err.stack||err.toString());
				return void lengthyReturn(null);
			}
			if(!shadow || typeof shadow.password!='string'){
				console.error('No shadow record:',shadow);
				return void lengthyReturn(null);
			}
			var comparePassword = methods[shadow.type];
			if((typeof comparePassword)!=='function'){
				console.error('No such password comparison function '+shadow.type);
				return void callback(null);
			}
			var record = {id:doc.subject, username:credential.username, realm:this.realm, type:shadow.type, password:shadow.password};
			comparePassword(record, credential, function(s){
				if(s===true) return void callback(null, {id:doc.subject, username:credential.username, realm:this.realm});
				return void lengthyReturn(null);
			});
		});
	});
}

ShadowStore.generate =
	{ "@id":"http://magnode.org/transform/AuthPasswordMongo_New"
	, domain:"http://magnode.org/AuthPasswordMongo"
	, range:["http://magnode.org/AuthPasswordMongo_Instance","http://magnode.org/AuthPassword_Instance"]
	, arguments:
		[ {type:"http://magnode.org/DBMongoDB_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/realm",object:"$result"}, default:"user"}
		]
	, construct: function(db, realm){ return new module.exports(db, realm.toString()); }
	};
