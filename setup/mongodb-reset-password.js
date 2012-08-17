#!/usr/bin/env node
var mongodb = require('mongolian');
var util=require('util');
var authpbkdf2=require('magnode/authentication.pbkdf2');

var arguments = process.argv.slice(2);
var dbHost, dbName, dbUsername, dbPassword, userAccountName, userPassword;
var file = 'mongodb.json';
for(var i=0; i<arguments.length; i++){
	switch(arguments[i]){
		case '-?':case '--help': return printHelp();
		case '-h':case '--host': dbHost=arguments[++i]; continue;
		case '-d':case '--db': dbName=arguments[++i]; continue;
		case '-u':case '--db-username': dbUsername=arguments[++i]; continue;
		case '-p':case '--db-password': dbPassword=arguments[++i]; continue;
	}
	throw new Error('Unknown argument '+util.inspect(arguments[i]));
}

var accountType = 'http://magnode.org/OnlineAccount';

function printHelp(){
	console.log('Reset a password in a Magnode MongoDB database');
}

var rl=require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

promptDBPassword();

function promptDBPassword(){
	if(dbPassword==='-'){
		rl.question('Password for '+userAccountName+'@'+dbHost+': ', function(v){ dbPassword=v; promptAccountName(); });
	}else{
		promptAccountName();
	}
}

var dbConnect, dbClient;

function promptAccountName(){
	rl.question('Account name: ', function(v){ userAccountName=v; promptPassword(); });
}

function promptPassword(){
	dbConnect = new mongodb(dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	dbClient = dbConnect.db(dbName);
	if(dbUsername) dbClient.auth(dbUsername, dbPassword);
	var dbNodes = dbClient.collection('nodes');

	dbNodes.findOne({type:accountType, accountName:userAccountName}, function(err, doc){
		if(err) throw err;
		if(!doc) throw new Error('Account (a '+accountType+') not found: '+userAccountName);
		rl.question('New account password: ', function(v){ userPassword=v; setPassword(doc); });
	});
}

function setPassword(doc){
	var dbShadow = dbClient.collection('shadow');
	authpbkdf2.generateRecord({password:userPassword}, function(newdoc){
		dbShadow.update({_id:doc._id}, newdoc, function(err){
			rl.close();
			dbConnect.close();
			if(err) throw err;
			//console.log('Done');
		});
	});
}

