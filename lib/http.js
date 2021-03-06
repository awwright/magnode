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
	'json': ['http://magnode.org/DocumentJSON'],
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

// Computes the effective request URI from request context and HTTP header information
module.exports.effectiveURI = effectiveURI;
function effectiveURI(req){
	// request-target = origin-form / absolute-form / authority-form / asterisk-form
	var requestLine = req.url;
	if(requestLine[0]=='/'){ // origin-form
		// Nodejs already splits on the whitespace
		// Allow clients/gateways to specify an "https:" scheme
		var scheme = req.headers['scheme']=='https' ? req.headers['scheme'] : 'http' ;
		return scheme + '://' + req.headers['host'] + requestLine;
	}else if(requestLine.match(/^[a-z][a-z0-9+.-]*:/)){ // absolute-form
		// This won't match if the scheme has anything uppercase. Maybe let's leave it this way.
		return requestLine;
	}else if(1){ // authority-form
		// authority-form = authority
		// authority   = [ userinfo "@" ] host [ ":" port ]
		throw new Error('Unsupported request-uri form');
	}else if(requestLine==='*'){ // asterisk-form
		// This isn't actually a valid URI, but the query is for us directly
		// TODO handle this in the future
		return req.url;
	}else{ // unknown/illegal form
		throw new Error('Invalid requestTarget');
	}
}

module.exports.handleRequest = handleRequest;
function handleRequest(request, response, route, staticresources, render){
	if(!render instanceof Render) throw new Error('render not an instanceof Render object');

	var Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');

	// Verify we will understand the semantics of the request
	// If it's a 0.9 client, just die already
	// If it's an HTTP 2.0 client, well maybe people will use this to detect if we support 2.0 features yet or not
	if(request.httpVersionMajor!=1 || request.httpVersionMinor>1){
		response.statusCode = 505;
		response.setHeader('Content-Type', 'text/plain');
		response.end('HTTP version unsupported: '+JSON.stringify(request.httpVersion)+"\n");
		return;
	}

	// Verify that Host header exists exactly once, per RFC 7230 Section 5.4
	// request.headers ignored repeated Host headers
	// request.rawHeaders exposes information in this
	var httpHost = undefined;
	for(var i=0; i<request.rawHeaders.length; i+=2){
		if(request.rawHeaders[i].toLowerCase()=='host'){
			if(httpHost===undefined){
				httpHost = request.rawHeaders[i+1];
			}else{
				httpHost = null;
				break;
			}
		}
	}
	if(typeof httpHost!='string'){
		response.statusCode = 400;
		response.setHeader('Content-Type', 'text/plain');
		response.end('Missing or invalid Host header\n');
		return;
	}

	// Verify that the Host header is well-formed
	// From RFC 3986 Section 3.2.2:
	//      host        = IP-literal / IPv4address / reg-name
	//      IP-literal = "[" ( IPv6address / IPvFuture  ) "]"
	//      IPvFuture  = "v" 1*HEXDIG "." 1*( unreserved / sub-delims / ":" )
	//      reg-name    = *( unreserved / pct-encoded / sub-delims )

	// req.uri can be added, must be an absolute-URI
	var resource = staticresources.resource || request.uri || request.url;

	// Get a list of types which the transform must be (i.e. transforms that render an editable form, or a transform that renders a read-only view)
	var urlArgs = urlParse(request.requestUri, true);
	var useTransformTypes = staticresources.useTransformTypes || [];

	// Verify that Host header matches agent request URI, per RFC 7230 Section 5.4
	if(httpHost!==urlArgs.host){
		response.statusCode = 400;
		response.setHeader('Content-Type', 'text/plain');
		//response.write(JSON.stringify([httpHost, urlArgs.host, request.uri, urlArgs],null,"\t")+"\n");
		response.end('Invalid Host header\n');
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
			// Dereference it, then perform a method-specific operation to determine how to respond
			route.route(resource, lookupResource);
			break;
		case "PUT":
			// PUT store the resource provided in the request-body to the request-uri
			// Generate a resource that reflects the result of this storage
			// TOOD: do something like this:
			// var resources = { Subroutine: function(request, reqBody){ database.store(request.uri, reqBody); return 200; } }
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
			if(request.requestDataBuffer){
				request.requestDataBuffer.expected = 0; // No request entity is allowed
			}
			if(staticresources["debugMode"]){
				response.statusCode = 200;
				response.setHeader("Content-Type", "message/http;msgtype=request");
				var body = request.method+' '+request.url+' HTTP/'+request.httpVersion+'\r\n';
				for(var i=0; i<request.rawHeaders.length; i+=2){
					body += request.rawHeaders[i]+': '+request.rawHeaders[i+1]+'\r\n';
				}
				response.end(body);
			}else{
				response.statusCode = 501;
				response.setHeader("Content-Type", "text/plain");
				response.end('TRACE disabled\n');
			}
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
		// TODO: Now let's query all the formatters to see who can format it into an HTTP response.
		// - If method is POST, render the resource into a Routine (function) and execute that, use return value as updated resource
		// - Look for formatters that can accept the resource as input and can write an HTTP response
		// - Filter out formatters and responses to those restricted by the 'allowed variants' parameter attached to the resource.
		// - Hand the formatters the details of the request to compute their output ranges
		// - Pick the formatter that can provide the best match
		// - Execute the formatter to provide a response

		// In the meantime, render a response from the partials
		renderHTTP(request, response, resources, render, useTransformTypes, urlArgs);
	}
};
