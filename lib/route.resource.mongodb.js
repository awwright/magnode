// route.resource.mongodb.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.resource');

module.exports.route = resourceRouter.create(
	function testResourceMongoDB(input, cb){
		// Work some bloom filter magic here
		//if(filter.test(uri)===false){
		//	cb(false);
		//	return;
		//}
		var resource = input.requesturl;
		input["db-mongodb"].findOne({subject:resource}, function(err, node){
			if(!node){
				cb(false);
				return;
			}
			cb(function renderResourceMongoDB(input, cbOut){
				// Function to produce output if we've been selected
				input.resource = resource;
				if(input.createNew){
					// Fill the new resource with blank data
					input.resource='_:new'+(Date.now()+Math.random());
					input.node={type:[resource]};
					// Set the type of the new resource
					// With ?new, `resource` becomes the type of a new resource
					input[resource]=input.node;
				}else input.node=node;


				// Type the input with the resource's types
				var resourceTypes = input.createNew?resource:node.type;
				resourceTypes = Array.isArray(resourceTypes)?resourceTypes:[resourceTypes];
				for(var i=0;i<resourceTypes.length;i++) input[resourceTypes[i]]=node;

				// Add the resource to the inputs
				cbOut();
			});
		});
	}
);
