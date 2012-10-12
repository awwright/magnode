#!/usr/bin/env node

// Disable debug output
//console.log=function(){}

var fs=require('fs');

var rdf=require('rdf');
rdf.environment.setPrefix("type", "http://magnode.org/");

// Parse runtime configuration
var arguments = process.argv.slice(2);
var listenPort=9000;
var database;
var profile;
var scanInstanceTransform;
function loadConfigFile(file){
	console.log("Load config file: %s", file);
	var config = JSON.parse(fs.readFileSync(file).toString());
	console.log(config);
	if(config.database) database=config.database;
	if(config.profile) profile=config.profile;
	if(config.scanInstanceTransform) scanInstanceTransform=config.scanInstanceTransform;
}
for(var i=0; i<arguments.length; i++){
	switch(arguments[i]){
		case '--config': loadConfigFile(arguments[++i]); continue;
		case '--port': listenPort=parseInt(arguments[++i]); continue;
		case '--database': database=arguments[++i]; continue;
		case '--profile': profile=arguments[++i]; continue;
		case '--setup':
			database = __dirname+'/data/setup.n3';
			profile = '_:setup';
			var port = 8080;
			if(arguments[i+1] && arguments[i+1].match(/^\d+$/)) port=arguments[++i];
			// This'll have some web UI to setup the database for the first time,
			// rescue a broken configuration, or manage a panel-less configuration
			// Create a password and prompt for it in the UI.
			// Display a URL in the form of http://user:pass@host:port/
			// This line gets moved to the admin panel libs, it will appear after the statement that the database and profile is selected
			var proto = 'http';
			var passChars = "0123456789abcdefghijkmnpqrstuvwxyz";
			var password = '';
			for(var i=0; i<10; i++) password+=passChars[Math.floor(Math.random()*passChars.length)];
			var host = 'localhost';
			var service = host + (port==80?'':(':'+port));
			console.log('Starting admin panel on %s://admin:%s@%s/', proto, password, service);
			continue;
		case '--help':
		case '-h':
		case '-?':
			console.log('usage: magnode.js [OPTION]');
			console.log('  --config file       Load a JSON configuration file');
			console.log('  --database db       Load profile from specified database');
			console.log('  --probile profile   Bootstrap from specified profile URI');
			console.log('  -?, -h, --help      Print argument list');
			return;
		default:
			console.log('Unhandled argument: %s', arguments[i]);
	}
}

// Setup server
console.log("Open database: %s", database);
var db = new (require("magnode/db.lazy"))( { file: database , format: "n3" } );

if(scanInstanceTransform && scanInstanceTransform.length){
	var gen = require('magnode/transform.InstanceTransform');
	for(var i=0; i<scanInstanceTransform.length; i++){
		var transform = gen.createTransform(require(scanInstanceTransform[i]));
		transform.about.forEach(function(v){db.add(v);});
	}
}

if(!profile){
	// This is _supposed_ to ask the database for the default profile to use but this may not work
	var m = db.match(database,"rdf:value").map(function(v){return v.object;});
	console.log(db);
	if(m[0]) profile=m[0];
}
console.log("Load profile: %s", profile);
var o = db.match(profile,"http://magnode.org/services").map(function(v){return v.object;});

var transformTypes =
	[ require('magnode/transform.ModuleTransform')
	, require('magnode/transform.InstanceTransform')
	];
var renders = new (require("magnode/view"))(db, transformTypes);
renders.cache = {};

// Server objects must be in the correct order to be chained
var list = db.getCollection(o[0]);
var instances = {};
for(var i=0; i<list.length; i++){
	var properties = db.match(list[i]);
	console.log("Generating service: %s", list[i]);
	console.log(properties);
	var resources = {db:db};
	// Type the input with the resource's types
	var resourceTypes = db.match(list[i], "rdf:type").map(function(v){return v.object});
	for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=list[i];
	renders.render('http://magnode.org/Service_Instance', resources, [], function(res){
		if(!res || !res['http://magnode.org/Service_Instance']) throw new Error('Service <'+list[i]+'> could not be created');
		console.log('Started <'+list[i]+'>');
	});
}

