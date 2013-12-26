#!/usr/bin/env node

// httpd.js: A simple-ish server script that runs a single website with Magnode
//    (Maybe multiple websites sometime in the future)

var path = require('path');
var fs = require('fs');
var configFile = process.env.MAGNODE_CONF || './server.json';
var listenPort = process.env.MAGNODE_PORT || process.env.PORT || 8080;
var httpInterfaces = [];
var runSetup = (process.env.MAGNODE_SETUP && process.env.MAGNODE_SETUP!=='0');
var pidFile = null;
var daemonize = null;
var clusterSize = null;

var magnode=require('magnode');
var rdf=require('rdf');
rdf.environment.setDefaultPrefix('http://localhost/');

function bail(){
	var route = new (magnode.require("route"));
	var renders = new (magnode.require("render"))(new rdf.TripletGraph, []);
	var p = (magnode.require("route.setup"))(route, configFile);
	// In most cases we're probably sitting behind a gateway, but at least we know the URL to forward requests to
	console.log('Visit setup page: http://localhost' + (listenPort===80?'':(':'+listenPort)) + p);
	var env =
		{ rdf: rdf.environment
		, authz: {test: function(a,b,c,cb){cb(true);}}
		};
	require('http').createServer(magnode.require("http").createListener(route, env, renders)).listen(listenPort);
}

function printHelp(){
	console.log('USAGE: '+process.argv[0]+' '+process.argv[1]+' [options]');
	console.log('A simple HTTP server for running Magnode');
	console.log('OPTIONS:');
	console.log('    --help -h -?         This help');
	console.log('    --conf <file>        Launch a particular website (default: "server.json")');
	console.log('    --port <int>         Listen on a particular TCP port');
	console.log('    --setup              Start in setup mode (automatic if conf file does not exist))');
	console.log('    --no-setup           Run normally');
	console.log('    --pidfile <file>     Write process id to a pid file');
	console.log('    --background         Fork process to background (default if --pidfile is specified)');
	console.log('    --foreground         Run process in foreground (default without --pidfile)');
	console.log('    --cluster            Spawn a Node.js cluster worker per CPU');
	console.log('    --cluster-size=<n>   Spawn a specified number of cluster workers');
	console.log('    --no-cluster         Do not use clustering (default)');
}

var argv = process.argv.slice(2);
function argValue(){ return argv[i][argn.length]=='=' ? argv[i].substring(argn.length+1) : argv[++i] ; }
for(var i=0; i<argv.length; i++){
	var argn = argv[i].split('=',1)[0];
	switch(argn){
		case '--conf': configFile=argValue(); break;
		case '--port': listenPort=parseInt(argValue()); break;
		case '--setup': runSetup=true; break;
		case '--no-setup': runSetup=false; break;
		case '--pidfile': pidFile=argValue(); break;
		case '--background': daemonize=true; break;
		case '--foreground': daemonize=false; break;
		case '--cluster': clusterSize=require('os').cpus().length; break;
		case '--cluster-size': clusterSize=parseInt(argValue()); break;
		case '--no-cluster': clusterSize=null; break;
		case '--help':
		case '-?':
		case '-h':
			printHelp(); return;
	}
}
if(daemonize===null) daemonize = !!pidFile;
configFile = require('path').resolve(process.cwd(), configFile);

if(pidFile){
	fs.writeFileSync(pidFile, process.pid);
}
if(daemonize){
	var fork = require('child_process').fork(__filename, process.argv.slice(2).concat('--foreground'));
	setTimeout(function(){
		console.error("Child process didn't reply");
		process.exit(1);
	}, 5000);
	fork.on('message', function(m) {
		if(m && m.fork==='ready'){
			console.log('httpd now listening');
			process.exit(0);
		}
	});
	return;
}

if(runSetup) return void bail();

// Run cluster after setup because we don't want/need to cluster the setup interface
// The setup UI assumes there's only one cluster and runs stuff in memory
if(clusterSize){
	var cluster = require('cluster');
	if(cluster.isMaster){
		// Fork workers.
		for (var i=0; i<clusterSize; i++) cluster.fork();
		cluster.on('exit', function(worker, code, signal) {
			console.log('worker ' + worker.process.pid + ' died');
		});
		// Stop. Hammer time.
		return;
	}
}

// Website-specific settings are defined in a config file
try{
	var configuration = require(configFile);
}catch(e){
	console.error(e.toString());
	return void bail();
}

var dbHost = configuration.dbHost;
var dbName = configuration.dbName;
var siteSuperuser = configuration.siteSuperuser;
var siteBase = configuration.siteBase;
var sitePrefixes = configuration.sitePrefixes || {};
// If none is specified, one will be generated randomly at startup
var siteSecretKey = configuration.siteSecretKey;
if(siteSecretKey && siteSecretKey.file){
	siteSecretKey = fs.readFileSync(path.resolve(path.dirname(configFile), siteSecretKey.file));
}
if(configuration.chdir){
	process.chdir(configuration.chdir);
}

//console.log=function(){}

// The two required options
try{
	if(!dbName && !dbHost) throw new Error('Need dbName or dbHost');
	if(!siteBase) throw new Error('Need siteBase');
}catch(e){
	console.error(e.stack||e.toString());
	return void bail();
}

rdf.environment.setDefaultPrefix(siteBase);
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));
for(var prefix in sitePrefixes) rdf.environment.setPrefix(prefix, sitePrefixes[prefix]);

// Keep track of open event listeners
var listeners = [];
process.on('SIGINT', closeProcess);
process.on('SIGTERM', closeProcess);
process.on('SIGHUP', closeProcess);

// Load the database of webpages
var mongodb = require('mongodb');
mongodb.connect(dbHost, function(err, dbClient){
listeners.push({name:'mongo', close:dbClient.close.bind(dbClient)});
var dbInstance = dbName?dbClient.db(dbName):dbClient;
var nodesDb = dbInstance.collection('nodes');
var shadowDb = dbInstance.collection('shadow');
var sessionStore = new (magnode.require("session.mac"))(
	{ expires: 1000*60*60*24*14
	, secret: siteSecretKey
	});

// The transforms database
var transformDb = new rdf.TripletGraph;

// The Authorizers grant permissions to users
var userAuthz = new (magnode.require("authorization.any"))(
	[ new (magnode.require("authorization.superuser"))(siteSuperuser)
	, new (magnode.require("authorization.usergroups.mongodb"))
	] );

// Provide login form for users to authenticate with
var passwordHashMethods = [magnode.require('authentication.pbkdf2').compareCredential];
var passwordGenerateRecord = magnode.require('authentication.pbkdf2').generateRecord;
var httpAuthCredential = new (magnode.require("authentication.mongodb"))(nodesDb, shadowDb, null, passwordHashMethods);
var httpAuthForm = new (magnode.require("authentication.form"))(
	{ domain: "/"
	, action: rdf.environment.resolve(':createSession')
	, credentials: httpAuthCredential
	}, userAuthz );
var httpAuthSession = new (magnode.require("authentication.session"))(sessionStore, userAuthz);
var httpAuthCookie = new (magnode.require("authentication.cookie"))(
	{ domain: "/"
	, secure: false // FIXME enable this as much as possible, especially if logging in over HTTPS
	, redirect: rdf.environment.resolve(':?from=login')
	}, httpAuthSession);
var httpAuthBearer = new (magnode.require("authentication.httpbearer"))({}, httpAuthSession);

// Also support HTTP Basic authentication with username/password
var httpAuthBasic = new (magnode.require("authentication.httpbasic"))({realm:'Magnode', credentials:httpAuthCredential}, userAuthz);

// Method authentication defines the various schemes in which a user may pass credentials to the application
// Whichever are authentic are subsequently checked that the credential grants the requested permission, and if so, defers to the authorizers
var authz = new (magnode.require("authorization.any"))(
	[ httpAuthForm
	, httpAuthCookie
	, httpAuthBearer
	, httpAuthSession
	, httpAuthBasic
	// Anonymous authorization which requires no authorization
	, new (magnode.require("authorization.read"))(['get','displayLinkMenu'], [rdf.environment.resolve(':Published')])
	, new (magnode.require("authorization.read"))(['get','displayLinkMenu'], ['http://magnode.org/NotFound'])
	] );

var transformTypes =
	[ magnode.require('transform.Jade')
	, magnode.require('transform.ModuleTransform')
	];
var renders = new (magnode.require("render"))(transformDb, transformTypes);

var libDir = path.dirname(require.resolve('magnode/render'));
magnode.require('scan.widget').scanDirectorySync(libDir, renders);
magnode.require('scan.ModuleTransform').scanDirectorySync(libDir, renders);
magnode.require('scan.turtle').scanDirectorySync('format.ttl', renders);
//transformDb.filter().forEach(function(v){console.log(JSON.stringify(v));});
magnode.require('scan.MongoDBJSONSchemaTransform').scanMongoCollection(nodesDb, renders);

var route = new (magnode.require("route"));

var resources = {
	"db-mongodb": dbInstance,
	"db-mongodb-nodes": nodesDb,
	"db-mongodb-schema": nodesDb,
	"db-mongodb-shadow": shadowDb,
	"db-transforms": transformDb,
	"db-rdfa": transformDb,
	"http://magnode.org/Auth": httpAuthCookie,
	"authz": authz,
	"password-hash": passwordGenerateRecord,
	"rdf": rdf.environment,
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Header": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Header",
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Panel": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Panel",
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Footer": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Footer",
};

// Import other configuration options if any, like "title" and "logo"
for(var f in (configuration&&configuration.option||{})){
	resources[f] = configuration.option[f];
}

// Sets a default theme to use, may be removed for a custom theme specified in format.ttl
require('./theme/twentyonetwelve').importTheme(route, resources, renders);

// Post-auth
httpAuthCookie.routeSession(route, httpAuthForm);

// Content
(magnode.require("route.status"))(route);
(magnode.require("route.routes"))(route);
(magnode.require("route.transforms"))(route, resources, renders);
httpAuthForm.routeForm(route, resources, renders, rdf.environment.resolve(':login'));
(magnode.require("route.mongodb.id"))(route, resources, renders);
(magnode.require("route.mongodb.subject"))(route, resources, renders);
(magnode.require("route.mongodbconn"))(route, resources, renders, rdf.environment.resolve(':mongodb/'), dbInstance);

// Handle HTTP requests
var listener = magnode.require('http').createListener(route, resources, renders);
httpInterfaces = [listenPort];
magnode.startServers(httpInterfaces, listener, httpReady);

});

function httpReady(err, httpInterfaces){
	if(err){
		console.error(err);
		closeProcess(1);
		return;
	}
	console.log('Listening');
	if(process.send){
		process.send({fork:"ready"});
	}
	httpInterfaces.forEach(function(v){ listeners.push({name:'httpd', close:v.close.bind(v)}); });
}

var closingProcess = false;
function closeProcess(code){
	if(closingProcess) return void forceExit();
	closingProcess = true;
	console.log('Closing process');

	var remaining = listeners.length;
	listeners.slice().forEach(function(listener){
		var name = listener.name || 'listener';
		console.log('Closing '+name+'...');
		listener.close(finished.bind(listener, name));
	});

	function finished(name){
		console.log('Closing '+name+'... Closed');
		if(--remaining!==0) return;
		process.exit(code);
	}

	function forceExit(){
		try {
			process.stderr.write('Graceful close timeout\n');
		} finally {
			process.exit(1);
		}
	}

	setTimeout(forceExit, 1000);
}

// This shouldn't ever happen, but, in case it does, note it and prevent the program from exiting
process.on('uncaughtException', function (err) {
  console.error((new Date).toISOString()+' - Uncaught Exception: ' + err.stack||err.toString());
});
