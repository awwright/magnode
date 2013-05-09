var mongodb = require('mongolian');
var fs = require('fs');

module.exports.parseMongoJSON = function parseMongoJSON(str, base){
	return JSON.parse(str, function(k, v){return module.exports.parser(k, v, base);});
}

module.exports.parser = function parser(k, v, base){
	var prefix = "http://localhost/";
	base = base||"http://localhost/";
	if(!v) return v;
	if(v.$ObjectId) return new mongodb.ObjectId(v.$ObjectId);
	if(v.$Date) return new Date(v.$Date);
	if(typeof v=='string' && v.substr(0,prefix.length)==prefix) return base+v.substr(prefix.length);
	if(typeof v=='object'){
		for(var n in v){
			if(n.substr(0,prefix.length)==prefix){
				// urlencode [%.$]
				var key = (base+n.substr(prefix.length)).replace(/%/g,'%25').replace(/\x2E/g, '%2E').replace(/\x24/g, '%24');
				v[key] = v[n];
				delete n[v];
			}
		}
	}
	return v;
}

module.exports.readFileSync = function readFileSync(filename, base){
	var content = fs.readFileSync(filename, 'utf8');
	return module.exports.parseMongoJSON(content, base);
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
			var where = {};
			if(record.subject){
				where.subject=record.subject;
				delete record._id;
			}else{
				where._id=record._id;
			}
			collection.upsert(where, record, done);
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
	var filename = files.shift();
	if(!filename) return void cb(null);
	console.log('Load: '+filename);
	try {
		var collections = module.exports.readFileSync(filename, base);
	}catch(e){
		return void cb(e);
	}
	module.exports.importData(collections, dbClient, function(err){
		if(err) return void cb(err);
		module.exports.importFiles(files, dbClient, base, cb);
	});
}
