#!/usr/bin/env node
var mongodb = require('mongolian');
var parseMongoJSON = require('./parsemongojson');
var util=require('util');

var arguments = process.argv.slice(2);
var dbHost, dbName, dbUsername, dbPassword;
var file = 'mongodb.json';
for(var i=0; i<arguments.length; i++){
	var flag=arguments[i], value, j=arguments[i].indexOf('=');
	if(j!==-1){
		value = flag.substr(j+1);
		flag = flag.substr(0,j);
	}
	switch(flag){
		case '-?':case '--help': return printHelp();
		case '-h':case '--host': dbHost=value||arguments[++i]; continue;
		case '-d':case '--db': dbName=value||arguments[++i]; continue;
		case '-u':case '--db-username': dbUsername=value||arguments[++i]; continue;
		case '-p':case '--db-password': dbPassword=value||arguments[++i]; continue;
		case '-f':case '--file': file=value||arguments[++i]; continue;
	}
	throw new Error('Unknown argument '+util.inspect(arguments[i]));
}

function printHelp(){
	console.log('Load sample/bootstrap Magnode data into MongoDB');
	console.log('options:');
	console.log('  -?  --help              produce help message');
	console.log('  -h, --host arg          mongo host to connect to');
	console.log('  -d, --db arg            database to use');
	console.log('  -f, --file arg          collection to use (some commands)');
	console.log('  -u, --db-username arg   username');
	console.log('  -p, --db-password arg   password (use - to prompt)');
}

if(dbPassword==='-'){
	var rl=require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter password: ', function(v){ dbPassword=v; importData(); });
}else importData();


function importData(){
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
	parseMongoJSON.importData(collections, dbClient, function(err){
		dbConnect.close();
		if(err){throw err;}
	});
}

