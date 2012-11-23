#!/usr/bin/env node
var mongodb = require('mongolian');
var util=require('util');
var authpbkdf2=require('magnode/authentication.pbkdf2');

var arguments = process.argv.slice(2);
var dbHost, dbName, dbUsername, dbPassword, userResource, userAccountName, userPassword;
var userCreate=false;

for(var i=0; i<arguments.length; i++){
	var flag=arguments[i], value, j=arguments[i].indexOf('=');
	if(j!==-1){
		value = flag.substr(j+1);
		flag = flag.substr(0,j);
	}
	switch(flag){
		case '-?':case '--help': return printHelp();
		case '-h':case '--db-host': dbHost=arguments[++i]; continue;
		case '-d':case '--db-name': dbName=arguments[++i]; continue;
		case '-u':case '--db-username': dbUsername=value||arguments[++i]; continue;
		case '-p':case '--db-password': dbPassword=value||arguments[++i]; continue;
		case '--resource': userResource=value||arguments[++i]; if(!userResource) throw new Error('Must specify --resource=URI'); continue;
		case '--username': userAccountName=value||arguments[++i]; if(!userAccountName) throw new Error('Must specify --username=userAccountName'); continue;
		case '--random-password': userPassword=require('crypto').randomBytes(10).toString('hex'); continue;
		case '--create': userCreate=true; continue;
		case '--no-create': userCreate=false; continue;
	}
	throw new Error('Unknown argument '+util.inspect(arguments[i]));
}

var accountType = 'http://magnode.org/OnlineAccount';

function printHelp(){
	console.log('Reset a password in a Magnode MongoDB database');
	console.log('  -h, --db-host arg       mongo host to connect to');
	console.log('  -d, --db-name arg       database to use');
	console.log('  -u, --db-username arg   username');
	console.log('  -p, --db-password arg   password (use - to prompt)');
	console.log('      --create            Create a new OnlineAccount');
	console.log('      --resource          The URI of the new OnlineAccount');
	console.log('      --username          The AccountName of the new OnlineAccount');
	console.log('      --random-password   Generate a random string to reset password');
}

var rl=require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

promptDBPassword();

function promptDBPassword(){
	if(dbPassword==='-'){
		rl.question('Password for '+dbUsername+'@'+dbHost+': ', function(v){ dbPassword=v; promptAccountResource(); });
	}else{
		promptAccountResource();
	}
}

function promptAccountResource(){
	var prompt = userCreate?'New account URI: ':'Account URI: ';
	if(userCreate){
		if(userResource){
			console.log(prompt+userResource);
			promptAccountName();
		}else{
			rl.question(prompt, function(v){ userResource=v; promptAccountName(); });
		}
	}else{
		promptAccountName();
	}
}

var dbConnect, dbClient;

function promptAccountName(){
	var prompt = userCreate?'New account name: ':'Account name: ';
	if(userAccountName){
		console.log(prompt+userAccountName);
		testAccountName();
	}else{
		rl.question(prompt, function(v){ userAccountName=v; testAccountName(); });
	}
}

function testAccountName(){
	dbConnect = new mongodb(dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	dbClient = dbConnect.db(dbName);
	if(dbUsername) dbClient.auth(dbUsername, dbPassword);
	var dbNodes = dbClient.collection('nodes');

	dbNodes.findOne({type:accountType, accountName:userAccountName}, function(err, doc){
		if(err) throw err;

		if(userCreate){
			if(doc) throw new Error('Resource already exists: '+userAccountName);
			var newUser = {_id:new mongodb.ObjectId, subject:userResource, type:[accountType], accountName:userAccountName};
			dbNodes.insert(newUser, function(){promptPassword(newUser)})
		}else{
			if(!doc) throw new Error('Account (a '+accountType+') not found: '+userAccountName);
			promptPassword(doc);
		}
	});
}

function promptPassword(doc){
	var prompt = userCreate?'New account password: ':'Reset account password: ';
	if(userPassword){
		console.log(prompt+userPassword);
		setPassword(doc);
	}else{
		rl.question(prompt, function(v){ userPassword=v; setPassword(doc); });
	}
}

function setPassword(user){
	var dbShadow = dbClient.collection('shadow');
	var dbNodes = dbClient.collection('nodes');
	authpbkdf2.generateRecord({password:userPassword}, function(shadow){
		if(!shadow._id) shadow._id = new mongodb.ObjectId();
		dbShadow.save(shadow, function(err){
			if(err) throw err;
			dbNodes.update({_id:user._id}, {$set:{password:shadow._id}}, function(err, updated){
				// TODO maybe remove the old shadow entry here?
				rl.close();
				dbConnect.close();
				if(err) throw err;
				//console.log('Done');
			});
		});
	});
}

