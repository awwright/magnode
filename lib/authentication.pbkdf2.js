/*
Validate a password against a given pbkdf2-sha1 hash
*/

var crypto = require('crypto');

module.exports.compareCredential = function pbkdf2(record, credential, callback){
	if(record.type!='pbkdf2'){
		return callback(false);
	}
	var parts = record.password.split(':');
	var hash = Buffer(parts[2],'base64').toString();
	crypto.pbkdf2(credential.password, Buffer(parts[0],'base64'), parseInt(parts[1]), hash.length, function(err, pass){
		if(hash===pass) return callback(true);
		return callback(false);
	});
}
