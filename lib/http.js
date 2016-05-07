var util = require('util');
var urlParse = require('url').parse;

var contenttype = require('contenttype');

var Render = require('./render');
var queryVariant = require('./queryvariant').parseUriVariants;
var parseJSON = require('./mongoutils').parseJSON;
var renderHTTP = require('./renderhttp');


module.exports.createListener = createListener;
function createListener(route, resources, render){
	return function(request, response){
		handleRequest(request, response, route, resources, render);
	}
}

var requiredTypeMap = module.exports.requiredTypeMap = {
	'edit': ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody'],
	'put.fn': ['http://magnode.org/HTTPResponse_PutFn'],
	'delete': ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody'],
	'delete.fn': ['http://magnode.org/HTTPResponse_DeleteFn'],
};

// Yeah, this is a hack
require('http').ServerResponse.prototype.addHeader = function addHeader(k, v){
	var headers = this.getHeader(k) || [];
	if(typeof headers === 'string') headers = [headers];
	if(!(v instanceof Array)) v = [v];
	this.setHeader(k, headers.concat(v));
}

module.exports.handleRequest = handleRequest;
function handleRequest(request, response, route, staticresources, render){
	if(!render instanceof Render) throw new Error('render not an instanceof Render object');

	var Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');

	// Verify we will understand the semantics of the request
	// If it's a 0.9 client, just die already
	// If it's an HTTP 2.0 client, well maybe people will use this to detect if we support 2.0 features yet or not
	function httpVersionUnsupported(){
		response.statusCode = 505;
		response.setHeader('Content-Type', 'text/plain');
		response.end('HTTP version unsupported: '+JSON.stringify(request.httpVersion)+"\n");
	}
	if(request.httpVersionMajor!=1) return void httpVersionUnsupported();
	if(request.httpVersionMinor>1) return void httpVersionUnsupported();

	// Verify that Host header exists exactly once, per RFC 7230 Section 5.4
	if(typeof request.headers['host']!='string'){
		response.statusCode = 400;
		response.setHeader('Content-Type', 'text/plain');
		response.end('Missing or invalid Host header\n');
		return;
	}

	// req.uri can be added, must be an absolute-URI
	var resource = staticresources.resource || request.uri || request.url;

	// Get a list of types which the transform must be (i.e. transforms that render an editable form, or a transform that renders a read-only view)
	var urlArgs = urlParse(request.requestUri, true);
	var useTransformTypes = urlArgs.query.with || [];
	if(!Array.isArray(useTransformTypes)) useTransformTypes = [useTransformTypes];
	if(staticresources.useTransformTypes){
		staticresources.useTransformTypes.forEach(function(v){
			useTransformTypes.push(v);
		});
	}

	// Verify that Host header matches agent request URI, per RFC 7230 Section 5.4
	if(request.headers['host']!==urlArgs.host){
		response.statusCode = 400;
		response.setHeader('Content-Type', 'text/plain');
		response.end('Invalid Host header\n'+JSON.stringify([request.headers.host, urlArgs.host, request.uri, urlArgs],null,"\t"));
		return;
	}

	// Right about here, we should implement a pre-request hook so people can rewrite requests
	// for the purpose of working around bad implementations
	// First a synchronous event
	// Then asynchronous middleware-style handlers

	switch(request.method){
		case "GET":
		case "HEAD":
		case "POST":
		case "PATCH":
		case "DELETE":
		case "OPTIONS":
			// These methods identify a particular resource in the database
			route.route(resource, lookupResource);
			break;
		case "PUT":
			// PUT provides the resource we're going to be operating on in the request-body,
			// and it's up to the called transforms to save that entity to the database.
			// POST scripts will perform their own transform of incoming media -> native representation as they see fit
			var resources = {};
			var waitEnd = false;
			if(request.headers['content-type']){
				var media = contenttype.parseMedia(request.headers['content-type']);
				// Type the request so that the proper transform can parse it
				switch(media.type){
					case 'application/x-www-form-urlencoded': resources['http://magnode.org/HTTPRequest-form-urlencoded']=request; break;
					case 'multipart/form-data': resources['http://magnode.org/HTTPRequest-multipart-form-data']=request; break;
				}
				if(media.type=='application/json' && media.params.profile){
					// This is sort of a hack to make JSON media types completely constistent
					resources['request:'+media.type+';profile='+media.params.profile] = request;
					waitEnd = true;
					require('./requestbody').readRequestBody(request, 30000, function(err, body){
						try {
							resources[media.params.profile] = parseJSON(body);
						}catch(e){
							response.statusCode = 400;
							response.setHeader('Content-Type', 'text/plain');
							response.end(e.toString());
							return;
						}
						haveResource(resources);
					});
				}else{
					resources['request:'+request.headers['content-type']] = request;
				}
			}
			if(!waitEnd){
				haveResource(resources);
			}
			break;
		case "TRACE":
			request.requestDataBuffer.expected = 0; // No request entity is allowed
			response.statusCode = 201;
			//response.setHeader("Content-Type", "message/http;msgtype=request");
			//response.end(util.inspect(request));
			response.setHeader("Content-Type", "text/plain");
			response.end();
			break;
		default:
			response.statusCode = 405; // or 501 if a server error
			response.setHeader("Content-Type", "text/plain");
			response.end("Unknown method: "+request.method+"\n");
			break;
	}

	function lookupResource(err, answers){
		var safeMethods = {GET:true, HEAD:true, OPTIONS:true, PROPFIND:true};
		var requireOne = !safeMethods[request.method];
		var dispatch = answers && answers[0];
		if(staticresources["debugMode"] && urlArgs.query.about==='resources'){
			response.writeHead(200, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("Error:\n"+util.inspect(err)+"\n\nAnswers:\n"+util.inspect(answers, {depth:3}));
		}else if(err){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\n"+status.toString());
		}else if(requireOne && answers.length>1){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\nMultiple routes declared their intent to handle a non-safe request");
		}else if(answers && answers.length===0){
			response.statusCode = 404;
			haveResource({'http://magnode.org/NotFound': {subject:resource, authorized:true}});
		}else if(!answers || !dispatch){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\nRoute error: No response made?");
		}else if(typeof dispatch=='function'){
			dispatch(request, response, staticresources, function(err, dbresult){haveResource(dbresult);});
		}else{
			var user = Object.create(dispatch);
			user.request = request;
			staticresources.authz.test(user, 'get', dispatch, function(authorized, reason, acceptAuth){
				if(authorized===true){
					haveResource(dispatch);
				}else{
					var denied = {};
					denied['http://magnode.org/Unauthorized'] = {subject: resource};
					response.statusCode = 401;
					if(acceptAuth){
						if(!Array.isArray(acceptAuth)) acceptAuth=[acceptAuth];
						var realms = acceptAuth.forEach(function(v){
							if(v.http) response.addHeader('WWW-Authenticate', v.http);
						});
					}
					haveResource(denied);
				}
			});
		}
	}

	function haveResource(dbresult){
		var requestenv = Object.create(staticresources);
		requestenv.request = request;
		requestenv.requesturl = resource;
		requestenv.requestenv = requestenv;
		requestenv.requestDataBuffer = request.requestDataBuffer;
		requestenv.response = response;
		requestenv.resource = resource;
		requestenv.variant = dbresult.variant || queryVariant(resource, requiredTypeMap);
		requestenv.createNew = requestenv.variant.createNew;
		var resources = Object.create(requestenv);
		for(var n in dbresult) resources[n] = dbresult[n];

		switch(request.method){
			case "GET":
			case "HEAD":
				useTransformTypes.push("http://magnode.org/view/GetTransform");
				break;
			case "POST":
				// Ugh, specializing POST requests
				// Is there any reason for a Web browser to send an actual POST request with form-urlencoded? Probably.
				// Is there any way for us to read this from the request body? Hardly.
				if(urlArgs.query.method==='put') useTransformTypes.push("http://magnode.org/view/PutTransform");
				else if(urlArgs.query.method==='delete') useTransformTypes.push("http://magnode.org/view/DeleteTransform");
				else useTransformTypes.push("http://magnode.org/view/PostTransform");
				break;
			case "PUT":
				useTransformTypes.push("http://magnode.org/view/PutTransform");
				break;
			case "DELETE":
				useTransformTypes.push("http://magnode.org/view/DeleteTransform");
				break;
		}
		if(requestenv.variant.useTransformTypes){
			requestenv.variant.useTransformTypes.forEach(function(v){
				useTransformTypes.push(v);
			});
		}

		if(request.requestDataBuffer){
			// Hold back the incoming data until someone else wants it
			// (Maybe someone wants to define request.requestDataBuffer for us)
			request.pause();
		}

		// Method type check
		if(!useTransformTypes.length){
			response.statusCode = 405; // or 501 if a server error
			response.setHeader("Content-Type", "text/plain");
			response.end("Unknown method: "+request.method+"\n");
			return false;
		}

		// Make sure the client won't be making use of any unsupported features
		var expectContinue = false;
		if(request.headers['expect']){
			var expects = request.headers['expect'].split(/\s/g);
			var unexpected = [];
			for(var i=0; i<expects.length; i++){
				var feature = expects[i];
				// Node.js will automatically respond to 100-continue, but
				// FIXME we should probably add a checkContinue hook anyways, due to the below entity-body checks
				if(feature==='100-continue'){
					expectContinue = true;
					continue;
				}
				unexpected.push(feature);
			}
			if(unexpected.length){
				// Else...
				response.statusCode = 417;
				response.setHeader("Content-Type", "text/plain");
				response.end("417 Expectation Failed\nThe server does not support the following features the client has indicated it requires:\n"+unexpected.join(', '));
				return false;
			}
		}

		// Check the entity-body is in order
		if(request.headers['content-type']){
			request.expectedLength = parseInt(request.headers['content-length']);
			if(!(request.expectedLength >= 0)){
				// This will be true if Content-Length is invalid: either NaN, undefined, or negative
				response.statusCode = 411;
				response.setHeader("Content-Type", "text/plain");
				response.end("411 Length Required\nA Content-Length header is required on requests.");
				return false;
			}else if(request.expectedLength > 32*1024*1024){
				// 32MB is twice the length of a MongoDB document which should be good enough for us for now
				// TODO: Allow resources to configure a lengthier Content-Length depending on credentials, method, and other input arguments
				response.statusCode = 413;
				response.setHeader("Content-Type", "text/plain");
				response.end("413 Request Entity Too Large\nThe entity body being uploaded is too large.");
				return false;
			}
		}else{
			if(requestenv.requestDataBuffer) requestenv.requestDataBuffer.expected = 0;
		}

		// Shamelessly advertise
		response.setHeader('Server', Server);

		// By now we've verified all that we can without examination of the entity-body, so send 100 Continue if requested.
		// If the request contains a 100-continue expectation, Node.js instead fires a checkContinue event if one is defined.
		// If one is not defined, it'll fire a regular request event. But we don't know which. Node.js does, however, set
		// response._sent100, but doesn't check for double-sending, so just check that we don't double-send the header.
		// FIXME will this work? This should work
		if(expectContinue && !response._sent100){
			response.writeContinue();
		}

		// At this point, we've got the resource (or know if it doesn't exist), we know the request is valid, and what the UA wants
		// TODO: Now let's query all the formatters to see who can format it into an HTTP response. Ask the list of formatters:
		// "Which type of variants can you generate from this resource?"
		// Filter out formatters that would not satisfy the client.
		// Ask the formatters to compute their best-case q-value and response headers
		// Pick the formatter that provides the best match
		// Have that formatter render out a response to the client

		// In the meantime, render a response from the partials
		renderHTTP(request, response, resources, render, useTransformTypes, urlArgs);
	}
};
