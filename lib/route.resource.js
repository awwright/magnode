var util = require('util');
var view = require('magnode/view');
var url = require('url');


module.exports = function(route, db, authz, renders, root){
	var prefix = root || "";

	function resourceExists(url, req){
		return parseURL(req.url).pathname;
	}
	renders["http://magnode.org/view/ModuleTransform"] = function(transform, input, callback){
		var module = db.filter({subject:transform,predicate:"http://magnode.org/view/module"});
		if(module[0]&&module[0].object){
			module = module[0].object.toString();
			if(input.log){
				//input.log("ModuleTransform: Transform "+transform+" run "+module+"("+util.inspect(input,false,0)+")");
			}
			var method = require(module);
			method(transform, input, callback);
		}
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
		var arguments = 
			{ db: db
			, authz: authz
			, request: request
			, response: response
			, resource: resource
			};
		// TODO: Take format=<transform> arguments from the URL and apply them to the inputs.
		// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.

		// Do the render step
		view.render(db, renders, "http://magnode.org/HTTPResponse", arguments, function(formatted){
			console.log("Resource rendered: "+util.inspect(formatted,false,0));
			if(!formatted['http://magnode.org/view/HTTPResponse']){
				response.setHeader("Content-Type", "text/plain");
				response.end("Could not render resource <"+resource+">\n");
			}
		});
	} );
}
