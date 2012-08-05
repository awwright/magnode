#!/usr/bin/env node
var mongodb = require('mongolian');
var parseMongoJSON = require('./parsemongojson');

var arguments = process.argv.slice(2);
var dbHost, dbName, dbUsername, dbPassword;
var file = 'mongodb.json';
for(var i=0; i<arguments.length; i++){
	if(arguments[i]=='-?'||arguments[i]=='--help') return printHelp();
	if(arguments[i]=='-h'||arguments[i]=='--host') dbHost=arguments[++i];
	if(arguments[i]=='-d'||arguments[i]=='--db') dbName=arguments[++i];
	if(arguments[i]=='-u'||arguments[i]=='--username') dbUsername=arguments[++i];
	if(arguments[i]=='-p'||arguments[i]=='--password') dbPassword=arguments[++i];
	if(arguments[i]=='-f'||arguments[i]=='--file') file=arguments[++i];
}

function printHelp(){
	console.log('Load sample/bootstrap Magnode data into MongoDB');
	console.log('options:');
	console.log('  -?  --help           produce help message');
	console.log('  -h, --host arg       mongo host to connect to');
	console.log('  -d, --db arg         database to use');
	console.log('  -f, --file arg       collection to use (some commands)');
	console.log('  -u, --username arg   username');
	console.log('  -p, --password arg   password (use - to prompt)');
}

if(dbPassword==='-'){
	var rl=require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter password: ', function(v){ dbPassword=v; importData(); });
}else importData();


function importData(){
	var waitingQueries = 1;
	console.error('Hostname: %s', dbHost);
	console.error('Username: %s', dbUsername);
	//console.error('Password: %s', dbPassword);
	console.error('Database: %s', dbName);
	console.error('Importing: %s', file);

	var collections = parseMongoJSON.readFileSync(file);

	var dbConnect = new mongodb(dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	var dbClient = dbConnect.db(dbName);
	if(dbUsername) dbClient.auth(dbUsername, dbPassword);

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
	waitingQueries--;

	function done(){
		if(--waitingQueries!==0) return;
		waitingQueries = false;
		dbConnect.close();
	}
}

