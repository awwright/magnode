var mongodb = require('mongolian');
var fs = require('fs');

module.exports.parseMongoJSON = function parseMongoJSON(str){
	return JSON.parse(str, module.exports.parser);
}

module.exports.parser = function parser(k, v){
	if(!v) return v;
	if(v.$ObjectId) return new mongodb.ObjectId(v.$ObjectId);
	if(v.$Date) return new Date(v.$Date);
	return v;
}

module.exports.readFileSync = function readFileSync(filename){
	var content = fs.readFileSync(filename, 'utf8');
	return module.exports.parseMongoJSON(content);
}

module.exports.importIndexes = function importIndexes(filename){
	var content = fs.readFileSync(filename, 'utf8');
	return module.exports.parseMongoJSON(content);
}

module.exports.importCollection = function importCollection(filename){
	var content = fs.readFileSync(filename, 'utf8');
	return module.exports.parseMongoJSON(content);
}
