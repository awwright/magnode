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
		var applyTransforms = (Array.isArray(urlArgs.query.apply)&&urlArgs.query.apply) || (typeof(urlArgs.query.apply)=="string"&&[urlArgs.query.apply]) || [];
		var editable = typeof(urlArgs.query.edit)=="string";
		var createNew = typeof(urlArgs.query.new)=="string";
		var arguments = 
			{ db: db
			, authz: authz
			, request: request
			, response: response
			, resource: resource
			};
		if(createNew) arguments[resource]="_:new";
		// TODO: Take format=<transform> arguments from the URL and apply them to the inputs.
		// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.

		// Do the render step
		view.render("http://magnode.org/HTTPResponse", arguments, function(formatted){
			console.log("Resource rendered: "+util.inspect(formatted,false,0));
			if(!formatted['http://magnode.org/HTTPResponse']){
				response.setHeader("Content-Type", "text/plain");
				response.end("Could not render resource <"+resource+">\n");
			}
		});
	} );
}
