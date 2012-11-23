#!/usr/bin/env node
var util=require('util');
var fs=require('fs');
var path=require('path');

var mongodb = require('mongolian');
var parseMongoJSON = require('./lib/parsemongojson');
var authpbkdf2=require('magnode/authentication.pbkdf2');

var accountType = 'http://magnode.org/OnlineAccount';
var userAccountName = 'root';

var arguments = process.argv.slice(2);
var values={};
var dbConnect, dbClient;

for(var i=0; i<arguments.length; i++){
	switch(arguments[i]){
		case '-?':case '--help': return printHelp();
		case '-n':case '--name': values.name=arguments[++i]; continue;
		case '-h':case '--db-host': values.dbHost=arguments[++i]; continue;
		case '-d':case '--db-name': values.dbName=arguments[++i]; continue;
		case '-b':case '--base': values.siteBase=arguments[++i]; continue;
	}
	throw new Error('Unknown argument '+util.inspect(arguments[i]));
}

function printHelp(){
	console.log('Load sample/bootstrap Magnode data into MongoDB');
	console.log('options:');
	console.log('  -?  --help           produce help message');
	console.log('  -n  --name           set site shortname');
	console.log('  -h  --db-host        set MongoDB host/port');
	console.log('  -d  --db-name        set MongoDB database name');
	console.log('  -b  --base           set website base URL');
}

var questions =
	{ name: {label:'Machine name (create directory in sites/)', default:'localhost', post:function(q,v){
		q.dbName.default='magnode-'+v.name;
		q.siteBase.default='http://'+v.siteBase+'/';
		}}
	, dbHost: {label:'MongoDB connection [user:password@]hostname[:port]', default:undefined}
	, dbName: {label:'MongoDB database', default:'magnode-blog'}
	, siteBase: {label:'Website Base URL', default:'http://localhost/', post:function(q,v){q.siteSuperuser.default=v.siteBase+'user/root';}}
	, siteSuperuser: {label:'Superuser id', default:'http://localhost/user/root'}
	};

var rl=require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

function nextPrompt(questions, prompts, values, cb){
	if(!prompts) prompts=Object.keys(questions);
	if(!values) values={};
	var option = prompts.shift();
	if(!option) return cb(null, values);
	var prompt = questions[option];
	var label = prompt.label+(prompt.default?(' ['+prompt.default+']'):'');
	if(values[option]!==undefined){
		console.log(label+': '+values[option]);
		if(typeof prompt.post=='function') prompt.post(questions, values);
		nextPrompt(questions, prompts, values, cb);
	}else{
		rl.question(label+': ', function(v){
			if(v==='') values[option] = prompt.default;
			else values[option] = v;
			if(typeof prompt.post=='function') prompt.post(questions, values);
			nextPrompt(questions, prompts, values, cb);
		});
	}
}

nextPrompt(questions, null, values, confirmData);

function confirmData(err){
	values.target = path.resolve('sites',values.name);
	//console.log('Will set up a database with the following options:');
	//console.log(util.inspect(options, false, undefined, true));
	console.log('Will write new files to the following path: '+values.target);
	nextPrompt({c:{label:'Proceed? [y/n]'}}, null, null, function(err, v){
		if(v.c && v.c[0].toLowerCase()=='y') setupDirectory();
		else{ console.log('Abort!'); rl.close(); }
	});
}

function setupDirectory(){
	fs.mkdirSync(values.target);

	// httpd.js
	var contents = fs.readFileSync(path.join(__dirname, 'example-blog/httpd.js'), 'utf8');
	function setValue(name, value){
		if(value===undefined) return;
		contents = contents.replace('var '+name+' = undefined;', 'var '+name+' = '+JSON.stringify(value)+';');
	}
	setValue('dbHost', values.dbHost);
	setValue('dbName', values.dbName);
	setValue('siteBase', values.siteBase);
	setValue('siteSuperuser', values.siteSuperuser);
	var bytes = require('crypto').randomBytes(64);
	var encoding = "";
	for(var i=0; i<bytes.length; i++) encoding += '\\x'+('00'+bytes[i].toString(16)).substr(-2);
	contents = contents.replace('var siteSecretKey = undefined;', 'var siteSecretKey = "'+encoding+'";');
	fs.writeFileSync(values.target+'/httpd.js', contents);
	fs.chmodSync(values.target+'/httpd.js', parseInt('775',8));

	// format.ttl
	var contents = fs.readFileSync(path.join(__dirname, 'example-blog/format.ttl'), 'utf8');
	contents = contents.replace('@base <http://localhost/> .', '@base <'+values.siteBase+'> .');
	fs.writeFileSync(values.target+'/format.ttl', contents);

	// Database
	importData();
}

function importData(){
	dbConnect = new mongodb(values.dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	dbClient = dbConnect.db(values.dbName);

	var files = ['base', 'List', 'OnlineAccount', 'Page', 'Post', 'frontpage', 'DocumentRegion', 'LinkMenu', 'ThemeData'];
	var paths = files.map(function(v){return path.resolve(__dirname+'/data', 'mongodb-'+v+'.json');});
	// FIXME Workaround to make sure we only execute dbConnect.close() after we've connected
	dbClient.collectionNames(function(){
		parseMongoJSON.importFiles(paths, dbClient, values.siteBase, checkSuperuser);
	});
}

function checkSuperuser(){
	var dbNodes = dbClient.collection('nodes');
	dbNodes.findOne({type:accountType, accountName:userAccountName}, function(err, doc){
		if(err) throw err;
		if(doc){
			console.error('Username already exists at <'+doc.subject+'>');
			console.error('Use mongodb-account.js to change passwords.');
			return done();
		}
		dbNodes.findOne({subject:values.siteSuperuser}, function(err, doc){
			if(err) throw err;
			if(doc){
				console.error('User already exists at <'+doc.subject+'>');
				console.error('Use mongodb-account.js to change passwords.');
				return done();
			}
			insertSuperuser();
		});
	});
}

function insertSuperuser(){
	var userPassword=require('crypto').randomBytes(10).toString('hex');
	var dbNodes = dbClient.collection('nodes');
	var dbShadow = dbClient.collection('shadow');

	authpbkdf2.generateRecord({password:userPassword}, function(shadow){
		if(!shadow._id) shadow._id = new mongodb.ObjectId();
		dbShadow.save(shadow, function(err){
			if(err) throw err;
			var newUser = {_id:new mongodb.ObjectId, subject:values.siteSuperuser, type:[accountType], accountName:userAccountName, password:shadow._id};
			dbNodes.insert(newUser, function(err){
				console.log('Created root user with password: '+userPassword);
				done();
				if(err) throw err;
			});
		});
	});
}

function done(){
	dbConnect.close();
	rl.close();
}

