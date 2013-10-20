#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var configFile = process.env.MAGNODE_CONF || './server.json';
var listenPort = process.env.MAGNODE_PORT || process.env.PORT || 8080;
var runSetup = (process.env.MAGNODE_SETUP && process.env.MAGNODE_SETUP!=='0');
var pidFile = null;
var daemonize = null;

var rdf=require('rdf');
rdf.environment.setDefaultPrefix('http://localhost/');

function bail(){
	var route = new (require("magnode/route"));
	var renders = new (require("magnode/render"))(new rdf.TripletGraph, []);
	var p = (require("magnode/route.setup"))(route, configFile);
	// In most cases we're probably sitting behind a gateway, but at least we know the URL to forward requests to
	console.log('Visit setup page: http://localhost' + (listenPort===80?'':(':'+listenPort)) + p);
	var env =
		{ rdf: rdf.environment
		, authz: {test: function(a,b,c,cb){cb(true);}}
		};
	require('http').createServer(require("magnode/http").createListener(route, env, renders)).listen(listenPort);
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
}

var argv = process.argv.slice(2);
for(var i=0; i<argv.length; i++){
	if(argv[i]=='--conf') configFile=argv[++i];
	if(argv[i]=='--port') listenPort=parseInt(argv[++i]);
	if(argv[i]=='--setup'){ runSetup=true; }
	if(argv[i]=='--no-setup'){ runSetup=false; }
	if(argv[i]=='--pidfile'){ pidFile=argv[++i]; }
	if(argv[i]=='--background'){ daemonize=true; }
	if(argv[i]=='--foreground'){ daemonize=false; }
	if(argv[i]=='--help'||argv[i]=='-?'||argv[i]=='-h'){ printHelp(); return; }
}
if(daemonize===null) daemonize = !!pidFile;
configFile = require('path').resolve(process.cwd(), configFile);

if(pidFile){
	fs.writeFileSync(pidFile, process.pid);
}
if(daemonize){
	var fork = require('child_process').fork(__filename, process.argv.slice(2).concat('--foreground'));
	process.exit();
}

if(runSetup) return void bail();

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

// Load the database of webpages
var mongodb = require('mongolian');
var dbClient = new mongodb(dbHost);
var dbInstance = dbName?dbClient.db(dbName):dbClient;
var nodesDb = dbInstance.collection('nodes');
var shadowDb = dbInstance.collection('shadow');
var sessionStore = new (require("magnode/session.mac"))(
	{ expires: 1000*60*60*24*14
	, secret: siteSecretKey
	});

// The transforms database
var transformDb = new rdf.TripletGraph;

// The Authorizers grant permissions to users
var userAuthz = new (require("magnode/authorization.any"))(
	[ new (require("magnode/authorization.superuser"))(siteSuperuser)
	, new (require("magnode/authorization.usergroups.mongodb"))
	] );

// Provide login form for users to authenticate with
var passwordHashMethods = [require('magnode/authentication.pbkdf2').compareCredential];
var passwordGenerateRecord = require('magnode/authentication.pbkdf2').generateRecord;
var httpAuthCredential = new (require("magnode/authentication.mongodb"))(nodesDb, shadowDb, null, passwordHashMethods);
var httpAuthForm = new (require("magnode/authentication.form"))(
	{ domain: "/"
	, action: rdf.environment.resolve(':createSession')
	, credentials: httpAuthCredential
	}, userAuthz );
var httpAuthSession = new (require("magnode/authentication.session"))(sessionStore, userAuthz);
var httpAuthCookie = new (require("magnode/authentication.cookie"))(
	{ domain: "/"
	, secure: false // FIXME enable this as much as possible, especially if logging in over HTTPS
	, redirect: rdf.environment.resolve(':?from=login')
	}, httpAuthSession);
var httpAuthBearer = new (require("magnode/authentication.httpbearer"))({}, httpAuthSession);

// Method authentication defines the various schemes in which a user may pass credentials to the application
// Whichever are authentic are subsequently checked that the credential grants the requested permission, and if so, defers to the authorizers
var authz = new (require("magnode/authorization.any"))(
	[ httpAuthForm
	, httpAuthCookie
	, httpAuthBearer
	, httpAuthSession
	// Anonymous authorization which requires no authorization
	, new (require("magnode/authorization.read"))(['get','displayLinkMenu'], [rdf.environment.resolve(':Published')])
	, new (require("magnode/authorization.read"))(['get','displayLinkMenu'], ['http://magnode.org/NotFound'])
	] );

var transformTypes =
	[ require('magnode/transform.Jade')
	, require('magnode/transform.ModuleTransform')
	];
var renders = new (require("magnode/render"))(transformDb, transformTypes);

var libDir = path.dirname(require.resolve('magnode/render'));
require('magnode/scan.widget').scanDirectorySync(libDir, renders);
require('magnode/scan.ModuleTransform').scanDirectorySync(libDir, renders);
require('magnode/scan.turtle').scanDirectorySync('format.ttl', renders);
//transformDb.filter().forEach(function(v){console.log(JSON.stringify(v));});
require('magnode/scan.MongoDBJSONSchemaTransform').scanMongoCollection(nodesDb, renders);

var route = new (require("magnode/route"));

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
(require("magnode/route.status"))(route);
(require("magnode/route.routes"))(route);
(require("magnode/route.transforms"))(route, resources, renders);
httpAuthForm.routeForm(route, resources, renders, rdf.environment.resolve(':login'));
(require("magnode/route.mongodb.id"))(route, resources, renders);
(require("magnode/route.mongodb.subject"))(route, resources, renders);

// Handle HTTP requests
console.log('HTTP server listening on port '+listenPort);
require('http').createServer(require('magnode/http').createListener(route, resources, renders)).listen(listenPort);

// This shouldn't ever happen, but, in case it does, note it and prevent the program from exiting
process.on('uncaughtException', function (err) {
  console.error((new Date).toISOString()+' - Uncaught Exception: ' + err.stack||err.toString());
});
