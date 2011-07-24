var util = require('util');
var view = require('magnode/view');
var url = require('url');

module.exports = function(route, db, authz, view, root){
	var prefix = root || "";

	function resourceExists(url, req){
		return parseURL(req.url).pathname;
	}
	route.push(function(v){
		var uri = url.resolve(prefix, v);
		if(db.indexSOP[uri]) return uri;
		// If it does not exist, try to resolve a CURIE
		// substr(1) to strip leading slash
		var resolved = uri.substr(1).resolve();
		if(db.indexSOP[resolved]) return resolved;
		// We couldn't find any match, fall through
		return null;
	}, function(request, response, resource, callback){
		var urlArgs = url.parse(request.url, true);
		// Get a list of transforms to apply to the resource before we start rendering the data
		var applyTransforms = (Array.isArray(urlArgs.query.apply)&&urlArgs.query.apply) || (typeof(urlArgs.query.apply)=="string"&&[urlArgs.query.apply]) || [];
		// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
		var useTransformTypes = (Array.isArray(urlArgs.query.with)&&urlArgs.query.with) || (typeof(urlArgs.query.with)=="string"&&[urlArgs.query.with]) || [];
		// Provide an ?edit shortcut to the appropriate transformType
		var editable = typeof(urlArgs.query.edit)=="string";
		var createNew = typeof(urlArgs.query.new)=="string";
		var arguments = 
			{ db: db
			, authz: authz
			, request: request
			, response: response
			, resource: resource
			};
		if(createNew) arguments.resource=resource="_:new";

		switch(request.method){
			case "GET":
			case "HEAD":
				if(editable) useTransformTypes.push("http://magnode.org/view/FormTransform");
				else useTransformTypes.push("http://magnode.org/view/ViewTransform");
				break;
			case "POST":
			case "PUT":
				if(editable) useTransformTypes.push("http://magnode.org/view/PostTransform");
				// Type the request so that the proper transform can parse it
				switch(request.headers['content-type']){
					case 'application/x-www-form-urlencoded': arguments['http://magnode.org/HTTPRequest-form-urlencoded']=request; break;
					case 'multipart/form-data': arguments['http://magnode.org/HTTPRequest-multipart-form-data']=request; break;
				}
				break;
		}

		if(applyTransforms.length) console.log('\x1b[1mApply transforms\x1b[0m: %s\n', applyTransforms.join(', '));
		if(useTransformTypes.length) console.log('\x1b[1mUse transform types\x1b[0m: %s\n', useTransformTypes.join(', '));

		// Type the input with the resource's types
		var resourceTypes = db.filter({subject:resource, predicate:"rdf:type"}).map(function(v){return v.object});
		for(var i=0;i<resourceTypes.length;i++) arguments[resourceTypes[i]]=resource;

		// TODO: Take format=<transform> arguments from the URL and apply them to the inputs.
		// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.

		// Do the render step
		view.render("http://magnode.org/HTTPResponse", arguments, useTransformTypes, function(formatted){
			console.log("Resource rendered: "+util.inspect(formatted,false,0));
			if(!formatted['http://magnode.org/HTTPResponse']){
				response.setHeader("Content-Type", "text/plain");
				//response.write(util.inspect(request));
				response.end("Could not render resource <"+resource+">\n");
			}
		});
	} );
}
