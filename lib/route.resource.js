var util = require('util');
var viewProto = require('./view');
var url = require('url');

module.exports.create = function(testResource){ return function(route, resources, authz, view, root){
	if(!view instanceof viewProto) throw new Error('view not an instanceof render object');
	var prefix = root || "";

	var resourceKeys = Object.keys(resources);

	var hook = function routeResource(request, cb){
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
		var target = "http://magnode.org/HTTPResponse";

		var input =
			{ authz: authz
			, request: request
			, requesturl: requesturl
			, requestDataBuffer: ""
			, createNew: createNew
			};
		for(var i=0; i<resourceKeys.length; i++) input[resourceKeys[i]] = resources[resourceKeys[i]];
		//for(var n in resources) input[n]=resources[n];

		switch(request.method){
			case "GET":
			case "HEAD":
				if(editable||createNew) useTransformTypes.push("http://magnode.org/view/FormTransform");
				else useTransformTypes.push("http://magnode.org/view/ViewTransform");
				break;
			case "POST":
			case "PUT":
				if(editable) useTransformTypes.push("http://magnode.org/view/PostTransform");
				// Type the request so that the proper transform can parse it
				switch(request.headers['content-type']){
					case 'application/x-www-form-urlencoded': input['http://magnode.org/HTTPRequest-form-urlencoded']=request; break;
					case 'multipart/form-data': input['http://magnode.org/HTTPRequest-multipart-form-data']=request; break;
				}
				break;
		}

		// Let's assume that if someone provided POST data we'll want to use it
		var requestDataBuffer={data:""};
		input.requestDataBuffer = requestDataBuffer;
		request.on("data", function(segment){ requestDataBuffer.data += segment; });
		//request.on("end", function(){ console.log('content: %s', input.requestData); });

		applyTransforms = applyTransforms.map(function(v){return v.resolve().toString()});
		if(applyTransforms.length) console.log('\x1b[1mApply transforms\x1b[0m: %s\n', applyTransforms.join(', '));
		if(useTransformTypes.length) console.log('\x1b[1mUse transform types\x1b[0m: %s\n', useTransformTypes.join(', '));

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

				cbOut(input, function(a){
					if(a) for(n in a) input[n]=a[n];

					// Take format=<transform> arguments from the URL and apply them to the inputs.
					// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.
					view.applyTransforms(applyTransforms.concat([]), input, function(input){
						// Do the render step
						view.render(target, input, useTransformTypes, function(formatted){
							console.log("Resource rendered: "+util.inspect(formatted,false,0));
							if(!formatted || !formatted['http://magnode.org/HTTPResponse']){
								response.setHeader("Content-Type", "text/plain");
								//response.write(util.inspect(request));
								//response.write("formatted:\n"+util.inspect(formatted)+"\n");
								response.end("Could not render resource <"+input.resource+">\n");
							}
						});
					});
				});
			}
			cb(response);
		});
	};
	route.push(hook);
}; }
