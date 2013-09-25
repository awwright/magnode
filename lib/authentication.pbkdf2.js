/*
Validate a password against a given pbkdf2-sha1 hash
*/

var crypto = require('crypto');

module.exports.compareCredential = function pbkdf2(record, credential, callback){
	if(record.type!='pbkdf2'){
		return void callback(false);
	}
	var parts = record.password.split(':');
	var salt = Buffer(parts[2],'base64');
	var iterations = parseInt(parts[3]);
	var hash = Buffer(parts[4],'base64');
	crypto.pbkdf2(credential.password, salt, parseInt(parts[3]), hash.length, function(err, pass){
		if(!(pass instanceof Buffer)) pass = Buffer(hash, 'binary');
		// Convert to hex because base64 has effectively-optional "=" padding
		if(hash.toString('hex')===pass.toString('hex')) return void callback(true);
		return void callback(false);
	});
}

// Key format: "kdf_function:hash_function:salt_base64:iteration_dec:hashresult_base64"
module.exports.generateRecord = function pbkdf2(credential, callback){
	// 128 bits is sufficent to ensure salts will always be unique
	var saltlen = 16;
	// TODO allow this to be variable... but not less than e.g. 1000 (10 bits of security)
	var iterations = 10000;
	// The output of a hash has n/2 bits of security, 256 bits output = 128 bits of security
	var keylen = 32;
	var salt = crypto.randomBytes(saltlen);
	crypto.pbkdf2(credential.password, salt, iterations, keylen, function(err, pass){
		if(err) throw err;
		if(!(pass instanceof Buffer)) pass = Buffer(pass,'binary');
		return void callback({type:'pbkdf2',password:'pbkdf2:sha1:'+salt.toString('base64')+':'+iterations+':'+pass.toString('base64')});
	});
}
