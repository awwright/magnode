var rdf=require('rdf');

var resourceRouter = require('./route.resource');

module.exports.route = resourceRouter.create(
	function(input, cb){
		var resource;
		var db = input.db;

		function success(v){
			resource = v;
			cb(cbOut);
			return;
		}

		var uri = url.resolve(prefix, input.requesturl);
		if(db.indexSOP[uri]) return success(uri);
		// If it does not exist, try to resolve a CURIE
		// substr(1) to strip leading slash
		var resolved = uri.substr(1).resolve();
		if(db.indexSOP[resolved]) return success(resolved);
		// We couldn't find any match, fall through
		cb(null);
		return;

		function cbOut(input, cbOut){
			// Function to produce output if we've been selected
			input.resource = resource;
			if(input.createNew){
				input[resource]=input.resource='_:new'+(Date.now()+Math.random());
			}

			// Type the input with the resource's types
			var resourceTypes = db.match(input.resource, rdf.rdfns("type")).map(function(v){return v.object});
			for(var i=0;i<resourceTypes.length;i++) input[resourceTypes[i]]=node;

			// Add the resource to the inputs
			cbOut();
		}
	}
);
