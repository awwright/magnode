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

module.exports.importData = function importData(collections, dbClient, callback){
	var waitingQueries = 1;
	var indexes = {};
	if(collections['system.indexes'] instanceof Array){
		var records = collections['system.indexes']
		for(var i=0; i<records.length; i++){
			var c = records[i].collection;
			var collection = dbClient.collection(c);
			if(!collections[c]) collections[c] = [];
			if(!indexes[c]) indexes[c] = [];
			indexes[c].push(records[i]);
		}
		delete collections['system.indexes'];
	}
	for(var c in collections){
		var collection = dbClient.collection(c);
		indexes[c] = indexes[c]||[];
		console.log('Collection: '+c);
		//console.log(indexes[c]);
		for(var i=0; i<indexes[c].length; i++){
			// (function(c,i){return function(){console.log('Imported index %s%j',c,indexes[c][i].key);}})(c,i)
			waitingQueries++;
			collection.ensureIndex(indexes[c][i].key, indexes[c][i].options, done);
		}
		//console.log(collections[c]);
		var records = collections[c];
		if(!records instanceof Array) throw new Error('Collection '+c+' not an Array');
		for(var i=0; i<records.length; i++){
			// (function(records,i){return function(){console.log('Imported row %s[%d]',c,i,records[i]);}})(records,i)
			waitingQueries++;
			collection.insert(records[i], done);
		}
	}
	done();

	function done(){
		if(--waitingQueries!==0) return;
		waitingQueries = false;
		callback();
	}
}
