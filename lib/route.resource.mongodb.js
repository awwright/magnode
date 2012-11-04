// route.resource.mongodb.js
// routeresourcemongodb.route(route, resources, httpAuthCookie, authz, renders, "http://magnode.org/");

var resourceRouter = require('./route.resource');
var parseURL = require('url').parse;

var route = module.exports.create = function MongoDBRouter(query){
	return resourceRouter.create(function testResourceMongoDB(input, cb){
		// Work some bloom filter magic here?
		//if(filter.test(uri)===false){
		//	cb(false);
		//	return;
		//}
		query(input, function(node){
			if(!node){
				cb(false);
				return;
			}
			var resource = node.subject;
			cb(function renderResourceMongoDB(input, cbOut){
				// Function to produce output if we've been selected
				input.resource = resource;
				if(input.createNew){
					// Fill the new resource with blank data
					input.resource='_:new'+(Date.now()+Math.random());
					input.node={type:[resource]};
					// Set pre-defined values...
					// TODO use a transform for this, maybe (pending security issues)
					var urlData = parseURL(input.request.url, true);
					for(var n in urlData.query){
						if(n.substr(0,6)=='value.'){
							var fieldName = n.substr(6);
							switch(fieldName){
								case 'subject':
									input.node[fieldName] = urlData.query[n];
									break;
							}
						}
					}
					// Set the type of the new resource
					// With ?new, `resource` becomes the type of a new resource
					input[resource]=input.node;
				}else input.node=node;


				// Type the input with the resource's types
				var resourceTypes = input.createNew?resource:node.type;
				resourceTypes = Array.isArray(resourceTypes)?resourceTypes:[resourceTypes];
				for(var i=0;i<resourceTypes.length;i++) if(input[resourceTypes[i]]===undefined) input[resourceTypes[i]]=node;

				// Add the resource to the inputs
				cbOut();
			});
		});
	});
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/HTTPRouter_Hook_typeMongoDBRender"
	, domain:"http://magnode.org/MongoDBRender"
	, range:"http://magnode.org/HTTPRouter_Hook"
	, arguments:
		[ {type:'http://magnode.org/HTTPRouter_Instance', inputs:[{object:"$subject",predicate:"http://magnode.org/register",subject:"$result"}]}
		, {type:'http://magnode.org/DBMongoDB_Instance', inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		, {type:'http://magnode.org/Render_Instance', inputs:[{subject:"$subject",predicate:"http://magnode.org/render",object:"$result"}]}
		, {type:'http://magnode.org/AuthHTTP_Instance', inputs:[{subject:"$subject",predicate:"http://magnode.org/auth",object:"$result"}]}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/base",object:"$result"}}
		]
	// FIXME:
	, construct: function(router, db, render, auth, base){ route(router, {'db-mongodb': db, 'http://magnode.org/Auth': auth}, {type:'authz'}, render, base); return []; }
	};
