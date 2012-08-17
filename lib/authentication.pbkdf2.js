/*
Validate a password against a given pbkdf2-sha1 hash
*/

var crypto = require('crypto');

module.exports.compareCredential = function pbkdf2(record, credential, callback){
	if(record.type!='pbkdf2'){
		return callback(false);
	}
	var parts = record.password.split(':');
	var hash = Buffer(parts[2],'base64');
	crypto.pbkdf2(credential.password, Buffer(parts[0],'base64'), parseInt(parts[1]), hash.length, function(err, pass){
		if(hash.toString('hex')===Buffer(pass,'binary').toString('hex')) return callback(true);
		return callback(false);
	});
}

module.exports.generateRecord = function pbkdf2(credential, callback){
	var saltlen = 16;
	var iterations = 10000;
	var keylen = 64;
	var salt = crypto.randomBytes(saltlen);
	crypto.pbkdf2(credential.password, salt, iterations, keylen, function(err, hash){
		if(err) throw err;
		return callback({type:'pbkdf2',password:salt.toString('base64')+':'+iterations+':'+Buffer(hash,'binary').toString('base64')});
	});
}
