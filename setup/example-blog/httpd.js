#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var configFile = process.env.MAGNODE_CONF || './server.json';
var listenPort = process.env.MAGNODE_PORT || process.env.PORT || 8080;
var runSetup = (process.env.MAGNODE_SETUP && process.env.MAGNODE_SETUP!=='0');

function bail(){
	var route = new (require("magnode/route"));
	var p = (require("magnode/route.setup"))(route, configFile);
	// In most cases we're probably sitting behind a gateway, but at least we know the URL to forward requests to
	console.log('Visit setup page: http://localhost' + (listenPort===80?'':(':'+listenPort)) + p);
	require('http').createServer(route.listener()).listen(listenPort);
}

var arguments = process.argv.slice(2);
for(var i=0; i<arguments.length; i++){
	if(arguments[i]=='--conf') configFile=arguments[++i];
	if(arguments[i]=='--port') listenPort=parseInt(arguments[++i]);
	if(arguments[i]=='--setup'){ runSetup=true; }
	if(arguments[i]=='--no-setup'){ runSetup=false; }
}
configFile = require('path').resolve(process.cwd(), configFile);

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

var rdf=require('rdf');
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setDefaultPrefix(siteBase);
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));

// Load the database of webpages
var mongodb = require('mongolian');
var dbClient = new mongodb(dbHost);
var dbInstance = dbName?dbClient.db(dbName):dbClient;
var nodesDb = dbInstance.collection('nodes');
var shadowDb = dbInstance.collection('shadow');

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
	, action: "/createSession"
	, credentials: httpAuthCredential
	}, userAuthz );
var httpAuthSession = new (require("magnode/authentication.session"))(
	{ expires: 1000*60*60*24*14
	, secret: siteSecretKey
	}, userAuthz);
var httpAuthCookie = new (require("magnode/authentication.cookie"))(
	{ domain: "/"
	, redirect: "/?from=login"
	}, httpAuthSession);

// Method authentication defines the various schemes in which a user may pass credentials to the application
// Whichever are authentic are subsequently checked that the credential grants the requested permission, and if so, defers to the authorizers
var authz = new (require("magnode/authorization.any"))(
	[ httpAuthForm
	, httpAuthCookie
	, httpAuthSession
	// Anonymous authorization which requires no authorization
	, new (require("magnode/authorization.read"))(['get','displayLinkMenu'], [rdf.environment.resolve(':Published')])
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
	"db": nodesDb,
	"db-mongodb": nodesDb,
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
httpAuthForm.routeForm(route, resources, renders, "/login");
(require("magnode/route.resource.mongodb.id"))(route, resources, renders);
(require("magnode/route.resource.mongodb.subject"))(route, resources, renders);

// Handle HTTP requests
console.log('HTTP server listening on port '+listenPort);
require('http').createServer(route.listener()).listen(listenPort);

// This shouldn't ever happen, but, in case it does, note it and prevent the program from exiting
process.on('uncaughtException', function (err) {
  console.error((new Date).toISOString()+' - Uncaught Exception: ' + err.stack||err.toString());
});

