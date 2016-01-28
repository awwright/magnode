
var ObjectId = require('mongodb').ObjectID;

module.exports.escapeKey = escapeKey;
function escapeKey(n){
	// a.k.a. [%$.]
	return n.replace(/\x25/g, '%25').replace(/\x24/g, '%24').replace(/\x2e/g, '%2E');
}

module.exports.unescapeKey = unescapeKey;
function unescapeKey(k){
	return decodeURIComponent(k);
}

module.exports.escapeObject = escapeObject;
function escapeObject(object){
	// Handles null
	if(!object) return object;
	if(typeof object=='object' && object && Array.isArray(object)){
		return Array.prototype.map.call(object, escapeObject);
	}
	if(typeof object=='object' && object && Object.getPrototypeOf(object)===Object.prototype){
		var escaped = {};
		for(var k in object){
			escaped[escapeKey(k)] = escapeObject(object[k]);
		}
		return escaped;
	}
	return object;
}

module.exports.unescapeObject = unescapeObject;
function unescapeObject(object){
	if(!object) return object;
	if(typeof object=='object' && object && Array.isArray(object)){
		return Array.prototype.map.call(object, unescapeObject);
	}
	if(typeof object=='object' && object && Object.getPrototypeOf(object)===Object.prototype){
		var original = {};
		for(var k in object){
			original[unescapeKey(k)] = unescapeObject(object[k]);
		}
		return original;
	}
	return object;
}


module.exports.serializeJSON = serializeJSON;
function serializeJSON(object){
	function serialize(k, v){
		// ObjectId presents a `toJSON` method that we want to bypass, so look up the original object value
		var value = this[k];
		if(value instanceof ObjectId) return {'$ObjectId': value.toString()};
		if(value instanceof Date) return {'$Date': value.toISOString()};
		return v;
	}
	return JSON.stringify(object, serialize, "\t");
}

module.exports.parseJSON = parseJSON;
function parseJSON(str){
	function revive(k, v){
		if(v && v['$ObjectId']) return new ObjectId(v['$ObjectId']);
		if(v && v['$Date']) return new Date(v['$Date']);
		return v;
	}
	return JSON.parse(str, revive);
}
