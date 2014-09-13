
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
	var escaped = {};
	for(var k in object){
		if(typeof object[k]=='object' && object[k] && Object.getPrototypeOf(object[k])===Object.prototype){
			escaped[escapeKey(k)] = escapeObject(object[k]);
		}else{
			escaped[escapeKey(k)] = object[k];
		}
	}
	return escaped;
}

module.exports.unescapeObject = unescapeObject;
function unescapeObject(object){
	var original = {};
	for(var k in object){
		if(typeof object[k]=='object' && object[k] && Object.getPrototypeOf(object[k])===Object.prototype){
			original[unescapeKey(k)] = unescapeObject(object[k]);
		}else{
			original[unescapeKey(k)] = object[k];
		}
	}
	return original;
}
