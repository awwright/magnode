var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');

var mongoutils = require('../../lib/mongoutils');

module.exports.parseMongoJSON = function parseMongoJSON(str, base){
	return JSON.parse(str, function(k, v){return JSONParser(k, v, base);});
}

// Like mongoutils.escapeObject but also replaces <http://localhost/> URIs
function JSONParser(k, v, base){
	var prefix = "http://localhost/";
	base = base||"http://localhost/";
	if(!v) return v;
	if(v.$ObjectId) return new ObjectId(v.$ObjectId);
	if(v.$Date) return new Date(v.$Date);
	if(typeof v=='string' && v.substr(0,prefix.length)==prefix) return base+v.substr(prefix.length);
	if(typeof v=='object' && v && Object.getPrototypeOf(v)===Object.prototype){
		var obj = {};
		for(var n in v){
			// urlencode [%.$]
			var key = mongoutils.escapeKey(n.replace(/^http:\/\/localhost\//, base));
			obj[key] = v[n];
		}
		return obj;
	}
	return v;
}

module.exports.readFileSync = function readFileSync(filename, base){
	var content = fs.readFileSync(filename, 'utf8');
	return module.exports.parseMongoJSON(content, base);
}

module.exports.importDocument = function importDocument(dbClient, collectionName, record, callback){
	// FIXME use ensureIndex
	if(collectionName=='system.indexes') return void callback();
	var collection;
	if(typeof collectionName=='string') collection = dbClient.collection(collectionName);
	else collection = collectionName;
	var where = {};
	/*
	if(record.subject){
		where.subject=record.subject;
		delete record._id;
	}else{
		where._id=record._id;
	}
	*/
	where._id=record._id;
	collection.update(where, record, {upsert:true}, callback);
}

module.exports.importData = function importData(collections, dbClient, callback){
	//console.log(require('util').inspect(collections,true,null,true)); return void callback();
	var waitingQueries = 1;
	var indexes = {};
	if(collections['system.indexes'] instanceof Array){
		var records = collections['system.indexes'];
		records.forEach(function(record){
			var c = record.collection;
			var collection = dbClient.collection(c);
			if(!collections[c]) collections[c] = [];
			if(!indexes[c]) indexes[c] = [];
			indexes[c].push(record);
		});
	}
	for(var c in collections){
		if(c=='system.indexes') continue;
		var collection = dbClient.collection(c);
		indexes[c] = indexes[c]||[];
		console.log('Collection: '+c);
		//console.log(indexes[c]);
		indexes[c].forEach(function(index){
			waitingQueries++;
			collection.ensureIndex(index.key, index.options, done);
		});
		//console.log(collections[c]);
		var records = collections[c];
		if(!(records instanceof Array)) throw new Error('Collection '+c+' not an Array');
		records.forEach(function(record){
			waitingQueries++;
			module.exports.importDocument(dbClient, collection, record, done);
		});
	}

	function done(err){
		if(err) console.log(err.stack||err.toString());
		if(waitingQueries && --waitingQueries===0){
			waitingQueries = false;
			callback();
		}
	}
	done();
}

module.exports.importFiles = function importFiles(files, dbClient, base, cb){
	var doc = files[0];
	if(!doc) return void cb(null);
	console.log('Load: '+doc.file);
	try {
		var data = module.exports.readFileSync(doc.file, base);
	}catch(e){
		return void cb(e);
	}
	module.exports.importDocument(dbClient, doc.collection, data, function(err){
		if(err) return void cb(err);
		module.exports.importFiles(files.slice(1), dbClient, base, cb);
	});
}
