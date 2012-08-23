#!/usr/bin/env node
var mongodb = require('mongolian');
var parseMongoJSON = require('./lib/parsemongojson');
var util=require('util');
var fs=require('fs');
var path=require('path');

var arguments = process.argv.slice(2);
var values={};

for(var i=0; i<arguments.length; i++){
	switch(arguments[i]){
		case '-?':case '--help': return printHelp();
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
}

var questions =
	{ name: {label:'Machine name (create directory in sites/)', default:'localhost', post:function(q,v){q.dbName.default='magnode-'+v.name;}}
	, dbHost: {label:'MongoDB connection [user:password@]hostname[:port]', default:undefined}
	, dbName: {label:'MongoDB database', default:'magnode-blog'}
	, siteBase: {label:'Website Base URL', default:'http://localhost/', post:function(q,v){q.siteSuperuser.default=v.siteBase.replace(/\/$/,'')+'/user/root';}}
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

function confirmData(err, options){
	options.target = path.resolve('sites',options.name);
	//console.log('Will set up a database with the following options:');
	//console.log(util.inspect(options, false, undefined, true));
	console.log('Will write new files to the following path: '+options.target);
	nextPrompt({c:{label:'Proceed? [y/n]'}}, null, null, function(err, v){
		if(v.c && v.c[0].toLowerCase()=='y') setupDirectory(options);
		else{ console.log('Abort!'); rl.close(); }
	});
}

function setupDirectory(options){
	fs.mkdirSync(options.target);

	// httpd.js
	var contents = fs.readFileSync(path.join(__dirname, 'example-blog/httpd.js'), 'utf8');
	function setValue(name, value){
		if(value===undefined) return;
		contents = contents.replace('var '+name+' = undefined;', 'var '+name+' = '+JSON.stringify(value)+';');
	}
	setValue('dbHost', options.dbHost);
	setValue('dbName', options.dbName);
	setValue('siteBase', options.siteBase);
	setValue('siteSuperuser', options.siteSuperuser);
	var bytes = require('crypto').randomBytes(64);
	var encoding = "";
	for(var i=0; i<bytes.length; i++) encoding += '\\x'+('00'+bytes[i].toString(16)).substr(-2);
	contents = contents.replace('var siteSecretKey = undefined;', 'var siteSecretKey = "'+encoding+'";');
	fs.writeFileSync(options.target+'/httpd.js', contents);
	fs.chmodSync(options.target+'/httpd.js', parseInt('775',8));

	// format.ttl
	var contents = fs.readFileSync(path.join(__dirname, 'example-blog/format.ttl'), 'utf8');
	contents = contents.replace('@base <http://localhost/> .', '@base <'+options.siteBase+'> .');
	fs.writeFileSync(options.target+'/format.ttl', contents);

	// Database
	importData(options);
}

function importData(options){
	var dbConnect = new mongodb(options.dbHost);
	dbConnect.log = {};
	dbConnect.log.debug = dbConnect.log.info = dbConnect.log.warn = function(){};
	dbConnect.log.error = console.error;
	var dbClient = dbConnect.db(options.dbName);

	var remaining = 1;
	var files = ['mongodb-base.json', 'mongodb-List.json', 'mongodb-OnlineAccount.json', 'mongodb-Page.json', 'mongodb-Post.json', 'mongodb-frontpage.json'];
	var paths = files.map(function(v){return path.resolve(__dirname+'/data', v);});
	// FIXME Workaround to make sure we only execute dbConnect.close() after we've connected
	dbClient.collectionNames(function(){
		parseMongoJSON.importFiles(paths, dbClient, options.siteBase, function(){ dbConnect.close(); rl.close(); });
	});
}

