#!/usr/bin/env node
var mongodb = require('mongolian');
var parseMongoJSON = require('./lib/parsemongojson');
var util=require('util');

var arguments = process.argv.slice(2);
var dbHost, dbName, dbUsername, dbPassword;
var verbose = true; // TODO implement this
var base = "http://magnode.org/";
var files = [];
for(var i=0; i<arguments.length; i++){
	if(arguments[i]=='--') break;
	var flag=arguments[i], value, j=arguments[i].indexOf('=');
	if(j!==-1){
		value = flag.substr(j+1);
		flag = flag.substr(0,j);
	}
	switch(flag){
		case '-?':case '--help': return printHelp();
		case '-h':case '--db-host': dbHost=value||arguments[++i]; continue;
		case '-d':case '--db-name': dbName=value||arguments[++i]; continue;
		case '-u':case '--db-username': dbUsername=value||arguments[++i]; continue;
		case '-p':case '--db-password': dbPassword=value||arguments[++i]; continue;
		case '-b':case '--base': base=value||arguments[++i]; continue;
		case '-f':case '--file': files.push(value||arguments[++i]); continue;
	}
	if(flag[0]=='-') throw new Error('Unknown argument '+util.inspect(arguments[i]));
	files.push(arguments[i]);
}
for(i++; i<arguments.length; i++) files.push(arguments[i]);

function printHelp(){
	console.log('Load sample/bootstrap Magnode data into MongoDB');
	console.log('options:');
	console.log('  -?  --help              produce help message');
	console.log('  -h, --db-host arg       mongo host to connect to');
	console.log('  -d, --db-name arg       database to use');
	console.log('  -u, --db-username arg   username');
	console.log('  -p, --db-password arg   password (use - to prompt)');
}

if(dbPassword==='-'){
	var rl=require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('MongoDB password: ', function(v){
		dbPassword=v;
		rl.close();
		importData();
	});
}else importData();


function importData(){
	console.error('Hostname: %s', dbHost);
	console.error('Username: %s', dbUsername);
	//console.error('Password: %s', dbPassword);
	console.error('Database: %s', dbName);
	console.error('Importing: %s', files.join('  '));


	var dbConnect = new mongodb(dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	var dbClient = dbConnect.db(dbName);
	if(dbUsername) dbClient.auth(dbUsername, dbPassword);
	// FIXME Workaround to make sure we only execute dbConnect.close() after we've connected
	dbClient.collectionNames(function(){
		parseMongoJSON.importFiles(files, dbClient, base, function(){ dbConnect.close(); });
	});
}

