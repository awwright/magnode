#!/usr/bin/env node

// httpd.js: A simple-ish server script that runs a single website with Magnode
//    (Maybe multiple websites sometime in the future)

var path = require('path');
var fs = require('fs');
var errctx = require('domain');
var crypto = require('crypto');

var configFile = process.env.MAGNODE_CONF || null;
var listenPort = null;
var dbHost = process.env.MAGNODE_MONGODB || null;
var httpInterfaces = [];
var setupMode = (process.env.MAGNODE_SETUP && process.env.MAGNODE_SETUP!=='0');
for(var setupPassword=''; setupPassword.length<7;) setupPassword += Math.floor(Math.random()*0x3ff).toString(32).replace(/l/g,'w').replace(/o/g,'x').replace(/u/g,'y');
var pidFile = null;
var daemonize = null;
var clusterSize = null;
var debugMode = false;

var magnode=require('magnode');
var rdf=require('rdf');
rdf.environment.setDefaultPrefix('http://localhost/');
var unescapeMongoObject = magnode.require('mongoutils').unescapeObject;

function printHelp(){
	console.log('USAGE: '+process.argv[0]+' '+process.argv[1]+' [options]');
	console.log('A simple HTTP server for running Magnode');
	console.log('OPTIONS:');
	console.log(' -? -h --help            This help');
	console.log(' -c --conf <file>        Launch a particular website (default: "server.json")');
	console.log(' -p --port <int>         Listen on a particular TCP port');
	console.log(' -d --debug              Enable debugging features (performance and possible security implications)');
	console.log('    --no-debug           Disable debugging features (default)');
	console.log('    --setup              Start in setup mode');
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
		case '--conf': case '-c': configFile=argValue(); break;
		case '--port': case '-p': listenPort=parseInt(argValue()); break;
		case '--setup': setupMode=true; break;
		case '--no-setup': setupMode=false; break;
		case '--debug': case '-d': debugMode=true; break;
		case '--no-debug': debugMode=false; break;
		case '--pidfile': pidFile=argValue(); break;
		case '--background': daemonize=true; break;
		case '--foreground': daemonize=false; break;
		case '--cluster': clusterSize=require('os').cpus().length; break;
		case '--cluster-size': clusterSize=parseInt(argValue()); break;
		case '--no-cluster': clusterSize=null; break;
		case '--help':
		case '-?':
		case '-h':
			printHelp();
			return;
	}
}
if(daemonize===null) daemonize = !!pidFile;
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
if(pidFile){
	fs.writeFileSync(pidFile, process.pid);
}

// Allow placing settings inside a config file
if(configFile){
	try{
		var configuration = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
	}catch(e){
		console.error(e.toString());
		return;
	}
}else{
	var configuration = {};
}

if(listenPort){
	httpInterfaces = [listenPort];
}else if(configuration.interfaces){
	httpInterfaces = configuration.interfaces;
}else if(process.env.PORT){
	httpInterfaces = [parseInt(process.env.PORT)];
}else{
	httpInterfaces = [8080];
}

// Run cluster after setup because we don't want/need to cluster the setup interface
// The setup UI assumes there's only one process and runs stuff in memory
if(clusterSize && !setupMode){
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

var dbHost = configuration.dbHost || dbHost;
var siteSuperuser = configuration.siteSuperuser;
if(!siteSuperuser){
	// If no root user id is explicitly defined, select a random URI
	siteSuperuser = 'urn:uuid:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.floor(Math.random()*16);
		return (c=='x' ? r : (r&0x7|0x8)).toString(16);
	});
}
var siteBase = configuration.siteBase || 'http://localhost/';
var sitePrefixes = configuration.sitePrefixes || {};
// If none is specified, one will be generated randomly in memory at startup
var siteSecretKey = configuration.siteSecretKey;
if(siteSecretKey && siteSecretKey.file){
	siteSecretKey = fs.readFileSync(path.resolve(path.dirname(configFile), siteSecretKey.file));
}
// Maybe the config defines a directory to make paths relative to... lets chdir there
if(configuration.chdir){
	process.chdir(configuration.chdir);
}

//console.log=function(){}

// The two required options
try{
	if(!dbHost) throw new Error('Need dbHost');
	if(!siteBase) throw new Error('Need siteBase');
}catch(e){
	console.error(e.stack||e.toString());
	return;
}

// The default prefix is used for defaulty-things sorta
rdf.environment.setDefaultPrefix(siteBase);
// Named prefixes are used for resolving CURIEs in the path component of URLs e.g. http://example.com/magnode:Page
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));
rdf.environment.setPrefix("uuid", "urn:uuid:");
for(var prefix in sitePrefixes) rdf.environment.setPrefix(prefix, sitePrefixes[prefix]);

// Keep track of open event listeners
var listeners = [];

// Close the process on many kinds of events
process.on('SIGINT', closeProcess);
process.on('SIGTERM', closeProcess);
process.on('SIGHUP', closeProcess);
// Also close the process on an uncaught exception
// This shouldn't ever happen, but if it does restart to clean up floating resources
process.on('uncaughtException', function uncaughtExceptionHandler(e){
	console.error((new Date).toISOString()+' - Uncaught Exception: \n'+(e.stack||e.toString()));
	closeProcess(2);
});

// Bring up the HTTP server as soon as possible
// (Maybe issue a 500 error while it's being brought up, or make this configurable for the sake of load balancers)
var resources = {};
resources["rdf"] = rdf.environment;
resources["debugMode"] = debugMode;

var transformDb = rdf.environment.createGraph();
resources["db-transforms"] = transformDb;
resources["db-rdfa"] = transformDb;
var transformTypes =
	[ magnode.require('transform.Jade')
	, magnode.require('transform.ModuleTransform')
	, magnode.require('transform.SubtypeTransform')
	];
var renders = new magnode.Render(transformDb, transformTypes);

// Allow people to define their own packages/extensions to use
try {
	fs.readdirSync('opt').forEach(function(v){
		var filename = 'opt/'+v+'/manifest.ttl';
		console.log('Import manifest: '+filename);
		try {
			magnode.require('scan.turtle').scanFileSync(filename, renders);
		}catch(e){
			console.error(e.stack);
		}
	});
}catch(e){
}

// Load Function/formatter/transformer definitions
var matches = renders.db.match(null, 'http://magnode.org/view/moduleSource', null);
matches.forEach(function(m){
	console.log('Import module: '+m.object);
	var filepath = m.object.toString().replace(/^file:\/\/\//, '/');
	renders.renders[m.subject] = require(filepath);
});

// Handle HTTP requests
var route = new magnode.Route;
var handleRequest = magnode.require('http').handleRequest;
function httpRequest(req, res){
	var c = errctx.create();
	c.add(req);
	c.add(res);
	c.on('error', function(err){
		console.error('Uncaught Exception in Request: '+(err.stack||err.toString()));
		try{
			res.statusCode = 500;
			res.setHeader('content-type', 'text/plain');
			res.write('Oops, there was a problem!\n');
			if(debugMode) res.write(err.stack||err.toString());
			res.end('\n');
		}catch(e2){
			console.error('Error writing 500 response to client: '+e2.toString());
		}
		// Close the underlying HTTP connection
		res.socket.destroy();
		// And close/restart the process
		// TODO add a cluster.worker.disconnect() if necessary
		// Since we caught the error and supposedly cleaned up the TCP connection,
		// And since different requests act independent of each other,
		// And since we're supposed to keep a constistent database, we
		// probably don't need to restart the server. But if you want to, here you go:
		//closeProcess(3);
	});
	c.run(function(){
		var uri = require('url').resolve('http://'+req.headers.host, req.url);
		var q = {base:{$lte:uri}, basez:{$gt:uri}};
		resources["db-mongodb-namespace"].findOne(q, function(err, ns){
			if(ns){
				ns = unescapeMongoObject(ns);
				var nsres = Object.create(resources);
				for(var k in ns.option) nsres[k] = ns.option[k];
			}
			handleRequest(req, res, route, nsres||resources, renders);
		});
	});
}
magnode.startServers(httpRequest, httpInterfaces, httpReady);

// Load the database of webpages
var mongodb = require('mongodb');
mongodb.connect(dbHost, function(err, dbInstance){
if(err){
	console.error(err.stack||err.toString());
	process.exit(2);
	return;
}
listeners.push({name:'mongo', close:dbInstance.close.bind(dbInstance)});
var usersDb = dbInstance.collection('user');
var schemaDb = dbInstance.collection('schema');
var shadowDb = dbInstance.collection('shadow');

resources["db-mongodb"] = dbInstance;
resources["db-mongodb-namespace"] = dbInstance.collection('namespace');
resources["db-mongodb-nodes"] = dbInstance.collection('nodes');
resources["db-mongodb-user"] = usersDb;
resources["db-mongodb-schema"] = schemaDb;
resources["db-mongodb-shadow"] = shadowDb;
resources["db-mongodb-region"] = dbInstance.collection('documentregion');
resources["db-mongodb-linkmenuitem"] = dbInstance.collection('linkmenuitem');

// Sets a default theme to use, may be removed for a custom theme specified in format.ttl
require('./theme/twentyonetwelve').importTheme(route, resources, renders);
// TODO remove this, generate an HTMLBody->HTMLDocument formatter with the appropriate resources embedded (maybe)
resources["http://magnode.org/theme/twentyonetwelve/DocumentRegion_Header"] = rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Header";
resources["http://magnode.org/theme/twentyonetwelve/DocumentRegion_Panel"] = rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Panel";
resources["http://magnode.org/theme/twentyonetwelve/DocumentRegion_Footer"] = rdf.environment.resolve(':about')+"#theme/twentyonetwelve/DocumentRegion_Footer";

if(setupMode){
	// setupMode gets a special reduced form of authorization where only the user with the randomly generated password has (root) access
	var userAuthz = new (magnode.require("authorization.superuser"))(siteSuperuser);
	var httpAuthCredential = {authenticateCredential: function(credential, callback){
		if(credential.username==="root" && setupPassword && setupPassword.length>4 && credential.password===setupPassword){
			return void callback(null, {id:siteSuperuser});
		}else{
			return void callback(null);
		}
	}, methods:{}};
	var httpAuthBasic = new (magnode.require("authentication.httpbasic"))({realm:'Magnode Setup', credentials:httpAuthCredential}, userAuthz);
	// TODO maybe also send 503 (Service Unavailable) while setupMode is enabled
	resources["authz"] = httpAuthBasic;
}else{
	var sessionStore = new (magnode.require("session.mac"))(
		{ expires: 1000*60*60*24*14
		, secret: siteSecretKey
		} );

	// The Authorizers grant permissions to users
	var userAuthz = new (magnode.require("authorization.any"))(
		[ new (magnode.require("authorization.superuser"))(siteSuperuser)
		, new (magnode.require("authorization.usergroups.mongodb"))
		] );

	// Provide login form for users to authenticate with
	var passwordHashMethods = [magnode.require('authentication.pbkdf2').compareCredential];
	var passwordGenerateRecord = magnode.require('authentication.pbkdf2').generateRecord;
	resources["password-hash"] = passwordGenerateRecord;

	var httpAuthCredential = new (magnode.require("authentication.mongodb"))(usersDb, shadowDb, null, passwordHashMethods);

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
	// Pass the authentication data to UserSession_typeAuth
	resources["http://magnode.org/Auth"] = httpAuthCookie;
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
		, new (magnode.require("authorization.read"))(['get','displayLinkMenu'], ['http://magnode.org/Function_CreateSession'])
		] );
	resources["authz"] = authz;
}

// Import known passwordHashMethods
var matches = renders.db.match(null, rdf.rdfns('type'), 'http://magnode.org/PasswordHashFn');
matches.forEach(function(m){
	// FIXME add some way to selectively disable this?
	console.log('Import PasswordHashFn: '+m.subject);
	httpAuthCredential.methods[m.subject] = renders.renders[m.subject];
	renders.db.match(m.subject, 'http://magnode.org/passwordHashName', null).forEach(function(n){
		httpAuthCredential.methods[n.object] = renders.renders[m.subject];
	});
});

// Indexers for search results, caching, and other precomputation on resources
// TODO Use of EventEmitter is essentially a hack, this will have to be built out custom later
// Most events should be triggered with a link relation to a Function stored in the function database (i.e. `renders`)
var indexer = new (require('events').EventEmitter);
resources['indexer'] = indexer;
indexer.on('HTTPAuto_typeMongoDB_Put_Operations', magnode.require("indexer.mongodblist"));
indexer.on('HTTPAuto_typeMongoDB_Put_Object', magnode.require("indexer.linkmenuitem"));
indexer.on('HTTPAuto_typeMongoDB_Put_Object', magnode.require("indexer.nodes"));

var libDir = path.dirname(require.resolve('magnode/render'));
magnode.require('scan.widget').scanDirectorySync(libDir, renders);
magnode.require('scan.ModuleTransform').scanDirectorySync(libDir, renders);
//transformDb.filter().forEach(function(v){console.log(JSON.stringify(v));});
var collectionsScan = magnode.require('scan.MongoDBJSONSchemaTransform').scanMongoCollection(dbInstance, schemaDb, renders);
// Enable this OR route.mongodb.subject
route.push(collectionsScan.route);
indexer.on('HTTPAuto_typeMongoDB_Put_Object', collectionsScan.indexer);

// Import other configuration options if any, like "title" and "logo"
for(var f in (configuration&&configuration.option||{})){
	resources[f] = configuration.option[f];
}

// Now parse the data that was defined in the manifests and import any functions they reference
// First, dereference transforms to functions
var matches = renders.db.match(null, rdf.rdfns('type'), 'http://magnode.org/view/Transform');
matches.forEach(function(m){
	if(renders.renders[m.subject]) return;
	var types = renders.db.match(m.subject, rdf.rdfns('type')).map(function(v){return v.object;});
	var mFunc;
	types.some(function(t){ if(renders.renders[t]){ mFunc=t; return true; } });
	if(mFunc){
		renders.renders[m.subject]=renders.renders[mFunc];
	}else{
		console.error('No transform function found for '+m.subject.toNT()+' types='+types.map(function(v){return v.toNT()}));
	}
});

// Dereference indexers
var indexNames = {
		'HTTPAuto_typeMongoDB_Put_Object': 'http://magnode.org/indexer/HTTPAuto_typeMongoDB_Put_Object'
};
for(var n in indexNames){
	var matches = renders.db.match(null, rdf.rdfns('type'), indexNames[n]);
	matches.forEach(function(m){
		var module = renders.db.match(m.subject, 'http://magnode.org/indexer/module', null);
		// Indexes must not do anything by themselves, but must be enabled by some user action
		// TODO add indexer listeners here
	});
}

// Setup static routes as defined by themes, if any
var matches = renders.db.match(null, rdf.rdfns('type'), 'http://magnode.org/StaticRoute');
matches.forEach(function(m){
	var docRoot = renders.db.match(m.subject, 'http://magnode.org/staticRouteRoot', null)[0].object.toString();
	var docRootPath = docRoot.replace(/file:\/\/\//, '/');
	var docNamespace = renders.db.match(m.subject, 'http://magnode.org/staticRouteNamespace', null)[0].object.toString();
	console.log(m.subject+' Serve '+docNamespace+' => '+docRootPath);
	(require('magnode/route.static'))(route, resources, renders, docRootPath, docNamespace);
});

if(httpAuthCookie && httpAuthForm){
	// Add a route at /createSession to authenticate other credentials (from httpAuthForm) and create a session, and set a cookie
	httpAuthCookie.routeSession(route, httpAuthForm);
}

// Content
// TODO move route.push out of the function call, use e.g.: route.push(magnode.require('route.status')())
(magnode.require("route.status"))(route);
(magnode.require("route.routes"))(route);
(magnode.require("route.transforms"))(route, resources, renders);
if(httpAuthForm) httpAuthForm.routeForm(route, resources, renders, rdf.environment.resolve(':login'));
(magnode.require("route.mongodb.id"))(route, resources, renders);
//(magnode.require("route.mongodb.subject"))(route, resources, renders);
(magnode.require("route.mongodbconn"))(route, resources, renders, rdf.environment.resolve(':mongodb/'), dbInstance);

if(setupMode){
	var p = magnode.require("route.setup").routeSetup(route, dbHost, configFile);
	(require('magnode/route.static'))(route, resources, renders, __dirname+'/setup/static/', '/about:setup/static/');
	magnode.require("route.setup").formatters.forEach(function(v){
		renders.add(v);
	});
}


}); // close mongodb.connect

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
	if(setupMode){
		var listenPort = httpInterfaces[0].address().port;
		console.log('Visit setup page: http://root:'+setupPassword+'@localhost' + (listenPort===80?'':(':'+listenPort)) + '/about:setup/');
	}
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
