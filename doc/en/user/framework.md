## Framework Setup
You will need to setup the library calls to get Magnode functioning as an application.

	#!/usr/local/bin/node

	//console.log=function(){}

	require('magnode/transform.Jade');

	var rdf=require('rdf');
	rdf.context.setMapping("album","http://example.com/album#");
	rdf.context.setMapping("m","http://magnode.org/auth/htdigest#");
	rdf.context.setMapping("node", "http://example.org/nodetype/");
	rdf.context.setMapping("type", "http://magnode.org/");

	// Determine if we listen on a different port
	var listenPort=8000;
	var arguments = process.argv.slice(2);
	for(var i=0; i&lt;arguments.length; i++){
		if(arguments[i]=='--port') listenPort=parseInt(arguments[++i]);
	}

	// Setup database
	var db = new (require("magnode/db.lazy"))(
			{ file: "data/format.n3"
			, format: "n3"
			} );

	// Authorization
	var authz = new (require("magnode/authorization.any"))(
		[ new (require("magnode/authorization.superuser"))("http://magnode.org/user/aaa")
		, new (require("magnode/authorization.read"))
		] );

	// Provide login form for users to authenticate with
	var httpAuthDigest = new (require("magnode/authentication.digest"))(db, "BZFX" );

	// Provide login form for users to authenticate with
	var httpAuthForm = new (require("magnode/authentication.form"))(
		{ domain: "/"
		, db: db
		, action: "/createSession"
		, credentials: httpAuthDigest
		} );

	// Cookies authenticate users after they've logged in
	var httpAuthCookie = new (require("magnode/authentication.cookie"))(
		{ domain: "/"
		, redirect: "/?from=login"
		, expires: 1000*60*60*24*14
		, secret: "Make this pretty long"
		} );

	var renders = new (require("magnode/view"))(db,
		[ require('magnode/transform.Jade')
		] );

	var route = new (require("magnode/route"));

	// 1. AUTHENTICATION
	(require("magnode/route.status"))(route);

	// 2. POST-AUTH for BEFORE routing, AFTER authentication
	httpAuthCookie.routeSession(route, httpAuthForm);

	// 3. CONTENT
	(require("magnode/route.status"))(route);
	(require("magnode/route.routes"))(route);
	httpAuthForm.routeForm(route, renders, "/login");
	(require("magnode/route.resource"))(
		route,
		db,
		httpAuthCookie,
		authz,
		renders,
		"http://magnode.org/"
		);

	// Handle HTTP requests
	require('http').createServer(route.listener()).listen(listenPort);

For information about how to setup Magnode as a framework, see the [Developer's Guide](#developer) and the [API Documentation](#api).
