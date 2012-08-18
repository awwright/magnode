## Framework Setup
You will need to setup the library calls to get Magnode functioning as an application.

Things to edit:

<dl>
<dt>http://example.com/</dt><dd>The base of your website. In setDefaultPrefix, URLs will be made relative to this if possible.</dd>
<dt>http://example.com/user/root</dt><dd>The resource identifying the superuser.</dd>
<dt>Secret key, make this pretty long</dt><dd>A secret key. It may be provided in the configuration file to keep the key constistent between restarts and between instances in a cluster. Keeping the empty string will generate a random key at runtime.</dd>
<dt>var dbClient = (new mongodb).db('blog');</dt><dd>Change blog to the name of the MongoDB database you want to use.</dd>
</dl>


	#!/usr/local/bin/node

	//console.log=function(){}

	require('magnode/transform.Jade');

	var rdf=require('rdf');
	rdf.environment.setPrefix("type", "http://magnode.org/");
	rdf.environment.setDefaultPrefix("http://example.com/");

	// Determine if we listen on a different port
	var listenPort=8000;
	var arguments = process.argv.slice(2);
	for(var i=0; i<arguments.length; i++){
		if(arguments[i]=='--port') listenPort=parseInt(arguments[++i]);
	}

	// Setup database
	var mongodb = (require('mongolian'));
	var dbClient = (new mongodb).db('blog');
	var db = dbClient.collection('nodes');
	var dbShadow = dbClient.collection('shadow');
	var dbFormat = new (require("magnode/db.lazy"))(
			{ file: "data/format.ttl"
			, format: "n3"
			} );

	// Authorization
	var authz = new (require("magnode/authorization.any"))(
		[ new (require("magnode/authorization.superuser"))("http://example.com/user/root")
		, new (require("magnode/authorization.read"))
		] );

	// Provide login form for users to authenticate with
	var passwordHashMethods = [require('magnode/authentication.pbkdf2').compareCredential];
	var httpAuthCredential = new (require("magnode/authentication.mongodb"))(db, dbShadow, "http://magnode.org/user/", passwordHashMethods);
	var httpAuthForm = new (require("magnode/authentication.form"))(
		{ domain: "/"
		, db: dbFormat
		, action: "/createSession"
		, credentials: httpAuthCredential
		} );

	// Cookies authenticate users after they've logged in
	var httpAuthCookie = new (require("magnode/authentication.cookie"))(
		{ domain: "/"
		, redirect: "/?from=login"
		, expires: 1000*60*60*24*14
		, secret: "" // Secret key, make this pretty long
		} );

	// Scan for transforms to import to the database
	var transformDb = new (require('magnode/db.memory'));
	require('magnode/transform.ModuleTransform').scanDirectorySync(__dirname+'/lib', transformDb);
	dbFormat.filter().forEach(function(v){transformDb.add(v);});
	require('magnode/transform.MongoDBJSONSchemaTransform').scanMongoCollection(db, transformDb);

	var transformTypes =
		[ require('magnode/transform.Jade')
		, require('magnode/transform.ModuleTransform')
		];
	var renders = new (require("magnode/view"))(transformDb, transformTypes);

	var route = new (require("magnode/route"));

	var resources = {
		"db": db,
		"db-mongodb": db,
		"db-mongodb-schema": db,
		"db-transforms": transformDb,
		"db-rdfa": dbFormat,
		"http://magnode.org/Auth": httpAuthCookie,
		"rdf": rdf.environment
	};

	// 1. AUTHENTICATION
	(require("magnode/route.status"))(route);

	// 2. POST-AUTH for BEFORE routing, AFTER authentication
	httpAuthCookie.routeSession(route, httpAuthForm);

	// 3. CONTENT
	(require("magnode/route.status"))(route);
	(require("magnode/route.routes"))(route);
	(require("magnode/route.transforms"))(route, resources, renders);
	httpAuthForm.routeForm(route, resources, renders, "/login");
	(require("magnode/route.resource.mongodb"))(route, resources, authz, renders);

	// Handle HTTP requests
	require('http').createServer(route.listener()).listen(listenPort);

For information about how to setup Magnode as a framework, see the [Developer's Guide](#developer) and the [API Documentation](#api).
