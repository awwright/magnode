#!/usr/bin/env node

var configuration = require('./server.json');
var dbHost = configuration.dbHost;
var dbName = configuration.dbName;
var siteSuperuser = configuration.siteSuperuser;
var siteBase = configuration.siteBase;
// If none is specified, one will be generated randomly at startup
var siteSecretKey = configuration.siteSecretKey;
if(siteSecretKey && siteSecretKey.file){
	siteSecretKey = require('fs').readFileSync(require('path').resolve(__dirname, siteSecretKey.file));
}

//console.log=function(){}

// The two required options
if(!dbName) throw new Error('Need dbName');
if(!siteBase) throw new Error('Need siteBase');

var rdf=require('rdf');
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setDefaultPrefix(siteBase);
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));

var listenPort=8080;
var arguments = process.argv.slice(2);
for(var i=0; i<arguments.length; i++){
	if(arguments[i]=='--port') listenPort=parseInt(arguments[++i]);
}

// Load the database of webpages
var mongodb = require('mongolian');
var dbClient = new mongodb(dbHost);
var dbInstance = dbClient.db(dbName);
var nodesDb = dbInstance.collection('nodes');
var shadowDb = dbInstance.collection('shadow');

// The transforms database
var formatDb = new (require("magnode/db.lazy"))(
		{ file: __dirname+"/format.ttl"
		, format: "n3"
		} );

var authz = new (require("magnode/authorization.any"))(
	[ new (require("magnode/authorization.read"))(['get'], [siteBase+'Published','http://magnode.org/Post','http://magnode.org/Page'])
	, new (require("magnode/authorization.read"))(['get','displayLinkMenu'], [siteBase+'Published'])
	, new (require("magnode/authorization.superuser"))(siteSuperuser)
	, new (require("magnode/authorization.usergroups.mongodb"))
	] );

// Provide login form for users to authenticate with
var passwordHashMethods = [require('magnode/authentication.pbkdf2').compareCredential];
var passwordGenerateRecord = require('magnode/authentication.pbkdf2').generateRecord;
var httpAuthCredential = new (require("magnode/authentication.mongodb"))(nodesDb, shadowDb, null, passwordHashMethods);
var httpAuthForm = new (require("magnode/authentication.form"))(
	{ domain: "/"
	, db: formatDb
	, action: "/createSession"
	, credentials: httpAuthCredential
	} );

// Cookies authenticate users after they've logged in
var httpAuthCookie = new (require("magnode/authentication.cookie"))(
	{ domain: "/"
	, redirect: "/?from=login"
	, expires: 1000*60*60*24*14
	, secret: siteSecretKey
	} );

var transformDb = new rdf.TripletGraph;
formatDb.forEach(function(v){transformDb.add(v);});

var transformTypes =
	[ require('magnode/transform.Jade')
	, require('magnode/transform.ModuleTransform')
	];
var renders = new (require("magnode/render"))(transformDb, transformTypes);

require('magnode/scan.widget').scanDirectorySync(__dirname+'/../../lib', renders);
require('magnode/scan.ModuleTransform').scanDirectorySync(__dirname+'/../../lib', renders);
//transformDb.filter().forEach(function(v){console.log(JSON.stringify(v));});
require('magnode/scan.MongoDBJSONSchemaTransform').scanMongoCollection(nodesDb, renders);

var route = new (require("magnode/route"));

// FIXME what's this, an exact path? Too many dots
require('./../../theme/twentyonetwelve').importTheme(renders, route);

var resources = {
	"db": nodesDb,
	"db-mongodb": nodesDb,
	"db-mongodb-schema": nodesDb,
	"db-mongodb-shadow": shadowDb,
	"db-transforms": transformDb,
	"db-rdfa": formatDb,
	"http://magnode.org/Auth": httpAuthCookie,
	"authz": authz,
	"password-hash": passwordGenerateRecord,
	"rdf": rdf.environment,
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Header": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Header",
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Panel": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Panel",
	"http://magnode.org/theme/twentyonetwelve/DocumentRegion_Footer": rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Footer",
};

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
require('http').createServer(route.listener()).listen(listenPort);

// This shouldn't ever happen, but, in case it does, note it and prevent the program from exiting
process.on('uncaughtException', function (err) {
  console.error((new Date).toISOString()+' - Uncaught Exception: ' + err.stack||err.toString());
});

