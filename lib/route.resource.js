var util = require('util');
var Render = require('./render');
var url = require('url');

var contenttype = require('contenttype');

module.exports.create = function createRoute(testResource){
	return registerHandler.bind(this, testResource);
}

function registerHandler(testResource, route, resources, view){
	if(!view instanceof Render) throw new Error('view not an instanceof render object');
	var prefix = resources.rdf&&resources.rdf.prefixes[''] || "";

	var hook = function routeResource(request, cb){
		var Server = this.Server;
		// Code if there's a request
		var requesturl = url.resolve(prefix, url.parse(request.url).pathname);
		var urlArgs = url.parse(request.url, true);
		// Get a list of transforms to apply to the resource before we start rendering the data
		var applyTransforms = (Array.isArray(urlArgs.query.apply)&&urlArgs.query.apply) || (typeof(urlArgs.query.apply)=="string"&&[urlArgs.query.apply]) || [];
		// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
		var useTransformTypes = (Array.isArray(urlArgs.query.with)&&urlArgs.query.with) || (typeof(urlArgs.query.with)=="string"&&[urlArgs.query.with]) || [];
		// Provide an ?edit shortcut to the appropriate transformType
		var editable = typeof(urlArgs.query.edit)=="string";
		var createNew = typeof(urlArgs.query.new)=="string";

		var input = Object.create(resources);
		input.request = request;
		input.requesturl = requesturl;
		input.requestenv = input;
		input.requestDataBuffer = {data:""};
		input.createNew = createNew;

		switch(request.method){
			case "GET":
			case "HEAD":
				if(editable||createNew) useTransformTypes.push("http://magnode.org/view/FormTransform");
				else useTransformTypes.push("http://magnode.org/view/ViewTransform");
				break;
			case "POST":
			case "PUT":
				useTransformTypes.push("http://magnode.org/view/PostTransform");
				break;
			case "DELETE":
				useTransformTypes.push("http://magnode.org/view/DeleteTransform");
				break;
		}

		// Type the request so that the proper transform can parse it
		switch(request.headers['content-type']){
			case 'application/x-www-form-urlencoded': input['http://magnode.org/HTTPRequest-form-urlencoded']=request; break;
			case 'multipart/form-data': input['http://magnode.org/HTTPRequest-multipart-form-data']=request; break;
		}

		// Hold back the incoming data until someone else wants it
		request.pause();

		applyTransforms = applyTransforms.map(function(v){return v.resolve().toString()});
		//if(applyTransforms.length) console.log('\x1b[1mApply transforms\x1b[0m: %s\n', applyTransforms.join(', '));
		//if(useTransformTypes.length) console.log('\x1b[1mUse transform types\x1b[0m: %s\n', useTransformTypes.join(', '));

		testResource(input, function(cbOut){
			if(!cbOut){
				// We're not going to handle this one
				cb(false);
				return false;
			}

			// Code if we are able to execute the request
			function response(request, response){
				if(!response){
					// We weren't assigned to handle this one
					// Clean up stuff
					return;
				}
				// We're selected to execute the request
				input.response = response;
				response.setHeader('Server', Server);

				cbOut(input, function(a){
					if(a) for(n in a) input[n]=a[n];

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
						var outputOptions = view.search('http://magnode.org/HTTPResponse', input, useTransformTypes);
						var contentList = [];
						outputOptions.forEach(function(res){
							Object.keys(res.output).forEach(function(v){
								if(v.substr(0,6)!=='media:') return;
								var parsed = contenttype.parseMedia(v.substr(6));
								parsed.result = res;
								parsed.objtype = v;
								contentList.push(parsed);
							});
						});
						var selected = contenttype.select(contentList, acceptList)
						target = selected&&selected.result || outputOptions[0];
						if(input.resource && selected){
							response.setHeader('Content-Location', input.resource+'?view='+encodeURIComponent(selected.objtype));
						}
					}
					if(!target){
						return void outputRender(new Error('Could not negotiate any Content-Type to generate'));
					}

					// Take format=<transform> arguments from the URL and apply them to the inputs.
					// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.
					view.applyTransforms(applyTransforms.concat([]), input, function(err, input){
						if(err) return void outputRender(err, input);
						// Do the render step
						if(target.transforms){
							view.applyTransforms(target.transforms, input, outputRender);
						}else{
							view.render(target, input, useTransformTypes, outputRender);
						}
					});

					function outputRender(err, formatted){
						if(err && !(err instanceof Error) && !formatted){
							formatted=err;
							err=null;
							console.error("Response returned through error argument: "+(new Error).stack);
						}
						console.log("Rendered: "+(formatted&&formatted.resource)||request.url);
						//console.log(util.inspect(arguments,false,0));
						if(!formatted || !formatted['http://magnode.org/HTTPResponse']){
							response.statusCode = 500;
							response.setHeader("Content-Type", "text/plain");
							//response.write(util.inspect(request));
							//response.write("formatted:\n"+util.inspect(formatted)+"\n");
							response.write("Could not render resource <"+input.resource+">\n");
							if(err){
								var id = (new Date).getTime().toString()+Math.random().toFixed(8).substr(1);
								response.write("Timestamp "+id+"\n");
								console.error("Timestamp "+id+"\n"+(err.stack||err.toString())+"\n\n");
							}
							response.end();
						}
					}
				});
			}
			cb(response);
		});
	};
	route.push(hook);
};
