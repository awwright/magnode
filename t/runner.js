#!/usr/bin/env node

var fs = require('fs');
var http = require('http');
var spawn = require('child_process').spawn;

var yaml = require('js-yaml');
var assert = require('chai').assert;
var mongodb = require('mongodb');

var parseMongoJSON = require('../setup/lib/parsemongojson');

var endpoint = 'http://localhost:8080/';

var files = [];
var httpdExe = __dirname + '/../httpd.js';
var statusCode = 0;

process.on('exit', function(){
	//console.log('Exit ' + statusCode);
	process.exit(statusCode);
});

function printHelp(){
	console.log('USAGE: '+process.argv[0]+' '+process.argv[1]+' [options]');
}

// We're the main process, we're entitled to do this
String.prototype.contains = function(s){
	return this.indexOf(s)>=0;
}

var argv = process.argv.slice(2);
function argValue(){
	return argv[i][argn.length]=='=' ? argv[i].substring(argn.length+1) : argv[++i] ;
}
for(var i=0; i<argv.length; i++){
	var argn = argv[i].split('=',1)[0];
	switch(argn){
		case '--endpoint': case '-e': endpoint=argValue(); break;
		case '--exe': case '-x': httpdExe=argValue(); break;
		case '--help':
		case '-?':
		case '-h':
			printHelp();
			return;
		default:
			files.push(argv[i]);
			break;
	}
}

function parseHeaders(data){
	var headers = [];
	data.split('\n').forEach(function(header){
		var name = header.split(':', 1)[0];
		if(!name) return;
		name = name.trim();
		var value = header.substring(name.length+1).trim();
		switch(name){
			case '-u':
			case '--user':
				name = 'Authorization';
				value = 'Basic ' + Buffer(value).toString('base64');
				break;
		}
		//headers[name] = value;
		headers.push({name:name, value:value});
	});
	return headers;
}

runFiles(0, function(){ console.log('Done'); });
function runFiles(i, callback){
	var nextFile = files[i];
	if(!nextFile) return void callback();
	runFile(nextFile, function(){ runFiles(i+1, callback); });
}
function runFile(filename, callback){
	console.log('Run file: '+filename);
	// 1. Arrange
	// Connect to a database
	var dbName = 'magnode-test-' + new Date().valueOf();
	var requests = [];
	var requestNames = {};
	var defaultRequest = {};
	yaml.loadAll(fs.readFileSync(filename, 'utf-8').replace(/\t/g, '    '), function(v){ requests.push(v); });
	var db, child;
	var running = true;
	mongodb.connect('mongodb://localhost/'+dbName, function(err, _db){
		if(err) throw err;
		db = _db;
		runFileDb();
	});

	function runFileDb(){
		// Verify the database doesn't exist
		db.collectionNames(function(err, names){
			if(err) throw err;
			if(names.length) throw new Error('Database already exists!');
			//var data = fs.readFileSync(__dirname+'/../setup/mongodb/schema/Schema.json'), 'utf-8');
			var importList = [
				{file:__dirname+'/../setup/mongodb/schema/Schema.json', collection:'schema'}
			].concat(requests[0].import||[]);
			parseMongoJSON.importFiles(importList, db, 'http://runner.local/', function(err){
				if(err) throw err;
				//console.log('Imported data', arguments);
				spawnHttpd();
			});
		});
	}
	function spawnHttpd(){
		// Import base.json data TODO
		child = spawn('httpd.js', {env:{'PORT':'0', 'MAGNODE_MONGODB':'mongodb://localhost/'+db.databaseName, 'MAGNODE_CONF':'t/runner.conf.json'}, stdio:[null,'pipe',2]});
		var childLog = '';
		child.stdout.on('data', function onData(str){
			//console.log(str.toString());
			childLog += str.toString();
			var m;
			if(m=childLog.match(/HTTP server listening on IPv4 0.0.0.0:(\d+)/)){
				childLog = undefined;
				child.stdout.removeListener('data', onData);
				//console.log('Server came up on port '+m[1]);
				runRequests(child, {port:parseInt(m[1])});
			}
		});
		child.on('close', function(){
			//console.log('https.js died');
			finishTest();
		});
	}
	function runRequests(child, client){
		// Wait for process to accept requests TODO
		// Import rest of resources TODO
		// 2. Act
		runRequest(0);
		function runRequest(i){
			if(running===false) return;
			var requestData = requests[i];
			if(!requestData) return void finishTest();
			if(requestData.default){
				defaultRequest = {};
				parseHeaders(requestData.default).forEach(function(v){ defaultRequest[v.name]=v.value; });
			}
			if(!requestData.request) return void runRequest(i+1);
			var headers = {};
			for(var n in defaultRequest) headers[n]=defaultRequest[n];
			parseHeaders(requestData.request).forEach(function(v){ headers[v.name]=v.value; });
			var vars = requestData.vars || {};
			for(var v in vars){
				var fn = new Function('response', 'requests', '"use strict";'+vars[v]);
				try {
					var value = fn({}, requestNames);
				}catch(e){
					console.error('Failed evaluation of var:', e);
				}
				for(var n in headers){
					headers[n] = headers[n].replace('{{'+n+'}}', value);
				}
			}
			var assertions = requestData.assert || [];
			if(!assertions.forEach) assertions=[assertions];
			var options = {};
			options.hostname = 'localhost';
			options.port = client.port;
			options.method = headers.Method;
			options.path = headers.Resource;
			options.headers = headers;
			var label = requestData.label || (options.method+' '+options.path);
			if(requestData.body) headers['Content-Length']=requestData.body.length;
			console.log(filename+' #'+i+'/'+requests.length+' '+options.method+' <'+options.path+'> '+label);
			var req = http.request(options);
			if(requestData.id) requestNames[requestData.id]=req;
			req.on('error', function(e){
				console.error(e);
			});
			req.once('response', function(res){
				req.response = res;
				res.body = '';
				res.on('data', function(v){ res.body += v.toString(); });
				res.on('end', function(){
					// 3. Assert
					var failures = 0;
					assertions.forEach(function(a){
						var fn = new Function('assert', 'response', 'requests', '"use strict";'+a);
						try {
							fn(assert, res, {});
						} catch (e){
							failures++;
							console.log('    \u001b[31m\u2718\u001b[39m '+e.toString());
						}
					});
					if(failures){
						statusCode = 1;
						console.log('Document body:');
						console.log(res.statusCode);
						console.log(res.body);
					}else{
						console.log('    \u001b[32m\u2713\u001b[39m');
					}
					runRequest(i+1);
				});
			});
			req.end(requestData.body||'');
		}
	}
	function finishTest(){
		if(running===false) return;
		running = false;
		db.dropDatabase(function(){
			db.close();
			child.kill();
			callback(null, requests);
		});
	}
}

