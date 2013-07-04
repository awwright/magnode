/*
Validate a password against a given pbkdf2-sha1 hash
*/

var crypto = require('crypto');

module.exports.compareCredential = function pbkdf2(record, credential, callback){
	if(record.type!='pbkdf2'){
		return void callback(false);
	}
	var parts = record.password.split(':');
	var salt = Buffer(parts[0],'base64');
	var iterations = parseInt(parts[1]);
	var hash = Buffer(parts[2],'base64');
	crypto.pbkdf2(credential.password, salt, parseInt(parts[1]), hash.length, function(err, pass){
		if(!(pass instanceof Buffer)) pass = Buffer(hash, 'binary');
		// Convert to hex because base64 has effectively-optional "=" padding
		if(hash.toString('hex')===pass.toString('hex')) return void callback(true);
		return void callback(false);
	});
}

module.exports.generateRecord = function pbkdf2(credential, callback){
	var saltlen = 16;
	var iterations = 10000;
	var keylen = 64;
	var salt = crypto.randomBytes(saltlen);
	crypto.pbkdf2(credential.password, salt, iterations, keylen, function(err, pass){
		if(err) throw err;
		if(!(pass instanceof Buffer)) pass = Buffer(pass,'binary');
		return void callback({type:'pbkdf2',password:salt.toString('base64')+':'+iterations+':'+pass.toString('base64')});
	});
}
