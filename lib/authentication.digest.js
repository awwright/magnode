/*
Validate a supplied username/password against an Apache-style Digest record in a database
*/

var sparqlParser = require('sparql-spin');
var rdf = require('rdf');
rdf.environment.setPrefix("sp", "http://spinrdf.org/sp#");
var digestQuery = sparqlParser.parse("SELECT * {?user foaf:accountName ?username; <http://magnode.org/auth/htdigest#password_digest_realm> ?realm ; <http://magnode.org/auth/htdigest#password_digest_md5> ?password. }");
var digestQueryGraph = rdf.parse(digestQuery).ref("_:query").graphify();
var crypto = require('crypto');

module.exports = function(db, realm){
	if(!db) throw new Error("credential.digest: Must provide a database");
	this.db = db;
	if(!realm) throw new Error("credential.digest: No realm of users selected");
	this.realm = realm;

}
module.exports.URI = "http://magnode.org/credential/DigestAccount";

module.exports.authenticateCredential = function(db, credential, callback){
	if(typeof(credential.username)!="string" || typeof(credential.realm)!="string" || typeof(credential.password)!="string"){
		callback(false);
		return false;
	}
	var v = db.evaluateQuery(digestQuery, "_:query", {username:credential.username.l(), realm:credential.realm.l()});

	console.log("Results:");
	console.log(require('util').inspect(v));
	if(!v || v.length===0){ callback(false); return false; }
	
	// If somehow multiple passwords are in the database, we only want the first one
	var fields = v[0];
	var hash = crypto.createHash("md5");
	hash.update(fields.username.value+":"+credential.realm+":"+credential.password);
	if(hash.digest("hex")==fields.password.value){
		// We're authenticated
		callback({id:fields.user, username:fields.username, realm:fields.realm});
	}else{
		callback(false);
	}
}
module.exports.prototype.authenticateCredential = function(credential, callback){
	module.exports.authenticateCredential(this.db, {username:credential.username, realm:this.realm, password:credential.password}, callback);
}
