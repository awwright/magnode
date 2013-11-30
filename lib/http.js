var util = require('util');
var Render = require('./render');
var urlParse = require('url').parse;
var urlResolve = require('url').resolve;

var contenttype = require('contenttype');

function createListener(route, resources, view){
	return function(request, response){
		handleRequest(request, response, route, resources, view);
	}
}

function handleRequest(request, response, route, staticresources, view){
	if(!view instanceof Render) throw new Error('view not an instanceof render object');
	var siteBase = staticresources.rdf&&staticresources.rdf.prefixes[''] || "";

	var Server = 'Magnode/a Nodejs/'+process.version.replace(/^v/,'');

	// Code if there's a request
	var urlArgs = urlParse(request.url, true);
	var path = urlArgs.pathname;
	// Ignore the Host header, but accept absolute URIs? This seems inconstistent
	var resource = staticresources.rdf.resolve(path.substring(1)) || urlResolve(siteBase, path);

	// Get a list of transforms to apply to the resource before we start rendering the data
	var applyTransforms = (Array.isArray(urlArgs.query.apply)&&urlArgs.query.apply) || (typeof urlArgs.query.apply=="string"&&[urlArgs.query.apply]) || [];
	// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
	var useTransformTypes = (Array.isArray(urlArgs.query.with)&&urlArgs.query.with) || (typeof urlArgs.query.with=="string"&&[urlArgs.query.with]) || [];
	// Provide an ?edit shortcut to the appropriate transformType
	var editable = typeof urlArgs.query.edit=="string";
	var createNew = typeof urlArgs.query.new=="string";
	var showDelete = typeof urlArgs.query.delete=="string";

	request.requestDataBuffer = {data:"", size:0, end:false};
	request.on('data', function(cz){
		request.requestDataBuffer.size += cz.length;
		if(request.requestDataBuffer.expected>=0 && request.requestDataBuffer.size>request.requestDataBuffer.expected){
			// If we start taking in more data than the connection declared, kill this thing
			request.socket.destroy();
		}
		request.requestDataBuffer.data += cz;
	});
	request.on('end', function(){
		request.requestDataBuffer.end = true;
	});

	function lookupResource(err, answers){
		var safeMethods = {GET:true, HEAD:true, PROPGET:true};
		var requireOne = !safeMethods[request.method];
		if(err){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\n"+status.toString());
		}else if(requireOne && answers.length>1){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\nMultiple routes declared their intent to handle a non-safe request");
		}else if(answers && answers.length===0){
			response.statusCode = 404;
			haveResource({'http://magnode.org/NotFound': {subject:resource, authorized:true}});
		}else if(!answers){
			response.writeHead(500, {'Content-Type': 'text/plain', 'Server':Server});
			response.end("500 Internal Server Error:\nRoute error: No response made?");
		}else{
			var dispatch = answers[0];
			if(typeof dispatch=='function'){
				dispatch(request, response, staticresources, function(err, dbresult){haveResource(dbresult);});
			}else{
				haveResource(dispatch);
			}
		}
	}

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
			// PUT provides the resource we're going to be operating on, and it's
			// up to the called transforms to save that entity to the database.
			haveResource({});
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

	function haveResource(dbresult){
		var requestenv = Object.create(staticresources);
		requestenv.request = request;
		requestenv.requesturl = resource;
		requestenv.requestenv = requestenv;
		requestenv.requestDataBuffer = request.requestDataBuffer;
		requestenv.response = response;
		requestenv.resource = resource;
		requestenv.createNew = createNew;
		var newresources = Object.create(requestenv);

		if(requestenv.createNew){
			// Take the resource that the database gave us, and create and present a new resource of that type
			var subject = siteBase + require('crypto').randomBytes(15).toString('base64').replace(/[+\/=]/g, function(a){return ({'+':'-','/':'_','=':''})[a];});
			newresources.resource = subject;
			// Alternatively use a bnode
			//newresources.resource = '_:new'+(Date.now()+Math.random());
			newresources.node = {type:[resource], subject:subject};
			// Set pre-defined values...
			// TODO use a transform for this, maybe (pending security issues)
			var urlData = urlParse(requestenv.request.url, true);
			for(var n in urlData.query){
				if(n.substr(0,6)=='value.'){
					var fieldName = n.substr(6);
					switch(fieldName){
						case 'subject':
							newresources.node[fieldName] = urlData.query[n];
							break;
					}
				}
			}
			// Set the type of the new resource
			// With ?new, `resource` becomes the type of a new resource
			newresources[resource]=newresources.node;
		}else{
			for(var n in dbresult) newresources[n] = dbresult[n];
		}

		switch(request.method){
			case "GET":
			case "HEAD":
				if(editable||createNew) useTransformTypes.push("http://magnode.org/view/PutFormTransform");
				else if(showDelete) useTransformTypes.push("http://magnode.org/view/DeleteFormTransform");
				else useTransformTypes.push("http://magnode.org/view/GetTransform");
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

		// Type the request so that the proper transform can parse it
		switch(request.headers['content-type']){
			case 'application/x-www-form-urlencoded': newresources['http://magnode.org/HTTPRequest-form-urlencoded']=request; break;
			case 'multipart/form-data': newresources['http://magnode.org/HTTPRequest-multipart-form-data']=request; break;
		}
		if(request.headers['content-type']){
			var media = contenttype.parseMedia(request.headers['content-type']);
			if(media.type=='application/json' && media.params.profile){
				// This is sort of a hack to make JSON media types completely constistent
				// FIXME This can get re-engineered later... For PUT requests, this should be moved up before this haveResource() call
				newresources['request:'+media.type+';profile='+media.params.profile] = request;
			}else{
				newresources['request:'+request.headers['content-type']] = request;
			}
		}

		// Hold back the incoming data until someone else wants it
		request.pause();

		applyTransforms = applyTransforms.map(function(v){return v.resolve().toString()});
		//if(applyTransforms.length) console.log('\x1b[1mApply transforms\x1b[0m: %s\n', applyTransforms.join(', '));
		//if(useTransformTypes.length) console.log('\x1b[1mUse transform types\x1b[0m: %s\n', useTransformTypes.join(', '));

		// Method type check
		if(!useTransformTypes.length){
			response.statusCode = 405; // or 501 if a server error
			response.setHeader("Content-Type", "text/plain");
			response.end("Unknown method: "+request.method+"\n");
			return false;
		}

		// Make sure the client won't be making use of any unsupported features
		if(request.headers['expect']){
			var expects = request.headers['expect'].split(/\s/g);
			var unexpected = [];
			for(var i=0; i<expects.length; i++){
				var feature = expects[i];
				// Node.js will automatically respond to 100-continue, but
				// FIXME we should probably add a checkContinue hook anyways, due to the below entity-body checks
				if(feature==='100-continue') continue;
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
			requestenv.requestDataBuffer.expected = parseInt(request.headers['content-length']);
			if(!(requestenv.requestDataBuffer.expected >= 0)){
				// This will be true of contentLength is NaN or undefined
				response.statusCode = 411;
				response.setHeader("Content-Type", "text/plain");
				response.end("411 Length Required\nA Content-Length header is required on requests.");
				return false;
			}else if(requestenv.requestDataBuffer.expected > 32*1024*1024){
				// 32MB is twice the length of a MongoDB document which should be good enough for us for now
				response.statusCode = 413;
				response.setHeader("Content-Type", "text/plain");
				response.end("413 Request Entity Too Large\nThe entity body being uploaded is too large.");
				return false;
			}
		}else{
			requestenv.requestDataBuffer.expected = 0;
		}

		// Shamelessly advertise
		response.setHeader('Server', Server);

		// Check that we were allowed to read the data from the database
		var resources;
		if(newresources.authorized===true){
			resources=newresources;
			renderResources();
			return;
		}
		newresources.authz.test(null, 'get', newresources, function(authorized){
			if(authorized===true){
				resources=newresources;
				renderResources();
			}else{
				resources = Object.create(requestenv);
				response.statusCode = 401;
				resources['http://magnode.org/Unauthorized'] = {subject: resource};
				renderResources();
			}
		});

		function renderResources(){
			var formatDocument = urlArgs.query.view || urlArgs.query.edit;
			var target;
			if(typeof formatDocument!='string') formatDocument=undefined;
			if(formatDocument){
				// We don't want anyone overriding the media: prefix
				formatDocument = (formatDocument.substr(0,6)==='media:'&&formatDocument) || resources.rdf.resolve(formatDocument) || resources.rdf.resolve(':'+formatDocument);
				target = ['http://magnode.org/HTTPResponse'];
				if(formatDocument) target.unshift(formatDocument);
			}else{
				var acceptList = contenttype.splitContentTypes(request.headers.accept || "*/*").map(contenttype.parseMedia);
				//acceptList.push(new contenttype.MediaType('*/*;q=0.0001'));
				var outputOptions = view.search('http://magnode.org/HTTPResponse', resources, useTransformTypes);
				var contentList = [];
				var filtered = outputOptions.filter(function(res){
					return Object.keys(res.output).some(function(v){
						if(v.substr(0,5)!=='view:') return;
						return typeof urlArgs.query[v.substring(5)]=='string';
					});
				});
				if(filtered.length) outputOptions = filtered;
				outputOptions.sort(function(a, b){ return (a.nice-b.nice) || (a.transforms.length-b.transforms.length); });
				outputOptions.forEach(function(res){
					Object.keys(res.output).forEach(function(v){
						if(v.substr(0,6)!=='media:') return;
						var parsed = contenttype.parseMedia(v.substr(6));
						parsed.result = res;
						parsed.objtype = v;
						contentList.push(parsed);
					});
				});
				var selected = contenttype.select(contentList, acceptList);
				target = selected&&selected.result || outputOptions[0];
				if(resources.resource && selected){
					response.setHeader('Content-Location', resources.resource+'?view='+encodeURIComponent(selected.objtype));
					response.setHeader('Vary', 'Accept');
				}
			}
			if(!target){
				return void outputRender(new Error('Could not negotiate any Content-Type to generate'));
			}
			if(0 && urlArgs.query.about==='transforms'){
				response.statusCode = 200;
				response.setHeader("Content-Type", "text/plain");
				response.write('Selected:\n'+util.inspect(selected)+'\n\n');
				response.write('Options:\n'+util.inspect(outputOptions)+'\n\n');
				response.end('\n');
				return;
			}

			// Take format=<transform> arguments from the URL and apply them to the inputs.
			// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.
			view.applyTransforms(applyTransforms.concat([]), resources, function(err, result){
				if(err) return void outputRender(err, result);
				// Do the render step
				if(target.transforms){
					view.applyTransforms(target.transforms, result, outputRender);
				}else{
					view.render(target, result, useTransformTypes, outputRender);
				}
			});

			function outputRender(err, formatted){
				if(err && !(err instanceof Error) && !formatted){
					formatted=err;
					err=null;
					console.error("Response returned through error argument: "+(new Error).stack);
				}
				console.log(request.socket.remoteAddress, request.method, request.url, 'HTTP/'+request.httpVersion, ' - <'+((formatted&&formatted.resource)||request.url)+'>', response.statusCode);
				//console.log(util.inspect(arguments,false,0));
				if(!formatted || !formatted['http://magnode.org/HTTPResponse']){
					if(response.statusCode<400) response.statusCode = 500;
					response.setHeader("Content-Type", "text/plain");
					//response.write(util.inspect(request));
					//response.write("formatted:\n"+util.inspect(formatted)+"\n");
					response.write(response.statusCode+' '+require('http').STATUS_CODES[response.statusCode]+'\n');
					response.write("Could not render resource <"+resources.resource+">\n");
					if(err){
						var id = (new Date).getTime().toString()+Math.random().toFixed(8).substr(1);
						response.write("Timestamp "+id+"\n");
						console.error("Timestamp "+id+"\n"+(err.stack||err.toString())+"\n\n");
					}
					response.end();
				}
			}
		}
	}
};

module.exports.createListener = createListener;
