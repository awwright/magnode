/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/

var rdf=require('rdf');
var context = {view:'http://magnode.org/view/'};

var Uritpl = require('uri-templates');

var queryVariant = require('./queryvariant').parseUriVariants;
var mongoutils = require('./mongoutils');

require('./transform.HTMLBodyAuto_typeMongoDB');
require('./transform.Document_typeJSON');
require('./transform.HTMLBodyAuto_typeMongoDB_Form');
require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm');
require('./transform.HTTPAuto_typeMongoDB_Put');
require('./transform.HTTPAuto_typeFormData_Post');

// A hard-coded minimal schema that will always describe valid MongoDBJSONSchema instances
module.exports.hypermetaschema = {
	type: 'object',
	links: [
		{ rel:'self', href:'{+id}' },
		{ rel:'type', href:'http://magnode.org/MongoDBJSONSchema' },
	]
};
var schemaType = 'http://magnode.org/MongoDBJSONSchema';

// TODO Create an indexer that watches for Schema changes and modifies `db` and `routes` and such as appropriate
// This avoids the need for restarting the server.
module.exports.scanMongoCollection = function(db, dbSchema, render, cb){
	// Create a URL router to use
	var routes = [];
	var collections = {};
	function routeRequest(resource, found){
		// Maybe ensure that every argument in the query string is handled, or else send a 404
		// That might violate the notion of ignore-unknown-headers, but then again,
		// people shouldn't be creating properties we didn't let them
		var requiredTypeMap = {
			'json': ['http://magnode.org/DocumentJSON'],
			'edit': ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody'],
			'put.fn': ['http://magnode.org/HTTPResponse_PutFn'],
			'delete': ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody'],
			'delete.fn': ['http://magnode.org/HTTPResponse_DeleteFn'],
		}
		var variant = queryVariant(resource, requiredTypeMap);
		variant.requiredTypes = variant.requiredTypes||{};

		var matches = [];
		for(var n in collections){
			collections[n].routes.forEach(function(route){
				if(!route.collection) return;
				var m = route.template.fromUri(variant.resource);
				// TODO Coerce m.filter into validating against m.route.schema here
				if(m) matches.push({match:m, route:route});
			});
		}
		findNext(0);

		function findNext(i){
			var v = matches[i];
			if(!v) return void found();
			var route = v.route;
			db.collection(route.collection).findOne(v.match, function(err, record){
				if(err) return void found(err);
				if(!record) return void findNext(i+1);
				record = mongoutils.unescapeObject(record);
				var variants = {};
				route.types.forEach(function(t){ variants[t.fillFromObject(record)] = record; });
				// If this is actually a schema, and the user specified <?new>, then create a new instance
				if(variants[schemaType] && 'new' in variant.params){
					resource = variant.toURI();
					var schema = variants[schemaType];
					// Search for a schema at variant.resource
					// Create an instance of it
					var instance = schema.default || {};
					var instanceVariants = {node: instance};
					if(schema.links instanceof Array){
						schema.links.forEach(function(t){
							if(t.rel!=='type') return;
							var type = new Uritpl(t.href).fillFromObject(instance);
							instanceVariants[type] = instance;
						});
					}
					// Later on, we will detect the absence of an _id and use that to assign a unique URI
					// Coerce it into validation
					// TODO implement this
					//instance._id = new ObjectId;
					// Return it
					foundRecord(schema, instanceVariants);
					// Handling the submission of the form is handled the same way as
					// any other custom script that a resource can produce as a variant
				}else{
					foundRecord(route.schema, variants);
				}
			});
		}
		function foundRecord(schema, variants){
			// The schema may define URLs for which particular type will be generated out
			if(schema.viewNames){
				var views = schema.viewNames;
				for(var name in views){
					requiredTypeMap[name] = views[name];
					delete variant.params[name];
				}
			}
			// Recalculate the variant with our more specific information
			variants.variant = queryVariant(resource, requiredTypeMap);
			if(variants.node && !variants.node._id){
				// The resource we have is a blank resource; we want to make a copy, not replace it (as if we could)
				variants.variant.createTarget = queryVariant(resource, requiredTypeMap);
				variants.variant.resource = 'urn:uuid:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.floor(Math.random()*16);
					return (c=='x' ? r : (r&0x7|0x8)).toString(16);
				});
			}
			// Generate menu items
			// TODO only include GetTransforms (which are guaranteed to be safe)
			// TODO add a label and display that, instead of the machine name
			var menuItems = [];
			var alternate = Object.create(variants.variant);
			alternate.requiredTypes = [];
			menuItems.push({title:'Default', href:alternate.toURI()});
			for(var n in requiredTypeMap){
				var alternate = Object.create(variants.variant);
				alternate.requiredTypes = requiredTypeMap[n];
				menuItems.push({title:n, href:alternate.toURI()});
			}
			variants['http://magnode.org/ResourceMenu'] = menuItems;

			var documentRequest = {
				schemaId: schema.id,
				schema: schema,
				// collection: this can be read from the schema, I guess
			};
			variants['http://magnode.org/MongoDBDocumentRequest'] = documentRequest;

			found(null, variants);
		}
	}

	var filter = {};
	// var filter = {type:"http://magnode.org/MongoDBJSONSchema", id:{$exists:true}};
	dbSchema.find(filter).each(function(err, doc){
		if(err) rsEnd(err);
		else if(doc) rsEach(doc);
		else rsEnd();
	});
	function rsEach(node){
		var node = mongoutils.unescapeObject(node);
		var collectionName = node.collection;
		updateSchema(collectionName, node);
	}
	function updateSchema(collection, node){
		if(collections[node.id]){
			console.log('Clear '+node.id);
			// Remove old definition if it exists
			// Now what do you suppose happens if a triple is added by two schemas, then removed once? FIXME?
			collections[node.id].graph.forEach(function(t){
				render.db.remove(t);
			});
		}
		var data = collections[node.id] = {
				graph: rdf.environment.createGraph(),
				schema: node,
				routes: [],
		};

		function addTriple(s,p,o){
			// FIXME this is only a quick fix for convenience
			// We should always be passed an RDFNode
			if(typeof s=='string') s=rdf.environment.createNamedNode(s);
			if(typeof p=='string') p=rdf.environment.createNamedNode(p);
			if(typeof o=='string') o=rdf.environment.createNamedNode(o);
			var t = rdf.environment.createTriple(s,p,o);
			data.graph.add(t);
			render.db.add(t);
		}
		function addResource(s,f,o){
			if(f) render.renders[s] = f;
			rdf.parse(o, s).graphify().forEach(function(t){
				data.graph.add(t);
				render.db.add(t);
			});
		}

		if(node.type!=='object'){
			console.error('Unacceptable schema '+node._id+':', node);
			return;
		}
		if(node.put && node.put.projectionTarget){
			console.log('projectionTarget: domain '+node.id);
			addResource(node.id+'_Transform_PutProjection', require('./transform.HTTPAuto_typeMongoDB_Put'),
				{ $context: context
				, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:PutTransform']
				, view$domain: {$list: [node.id, 'http://magnode.org/UserSession']}
				, view$range: 'http://magnode.org/HTTPResponse'
				, view$nice: 1
				} );
			return;
		}
		if(!node.collection){
			// Skip schemas not listing any collection
			return;
		}
		var selfLinks = [];
		module.exports.hypermetaschema.links.forEach(function(tpl){
			if(tpl.rel==='self'){
				var uri = new Uritpl(tpl.href).fillFromObject(node);
				selfLinks.push(uri);
			}
		});
		console.log('MongoDBJSONSchema import: %s %s', node._id, selfLinks[0]);
		if(!selfLinks.length){
			console.error('No URI given to schema schema %s', node._id);
			return;
		}
		var links = node.links;
		if(links instanceof Array){
			var types = [];
			links.forEach(function(v){
				if(v.rel!=='type') return;
				console.log('Link: <'+node.id+'> a <'+v.href+'> .');
				// TODO resolve v.href against a URI base... This probably has to be done in route()
				types.push(new Uritpl(v.href));
			});
			links.forEach(function(v){
				if(v.rel!=='self') return;
				console.log('Link: <'+node.id+'> rel:self <'+v.href+'> .');
				data.routes.push({template:new Uritpl(v.href), types:types, collection:node.collection, schema:node});
			});
		}
		// TODO all of these addResource calls should be plugable
		// e.g. especially a "Get comment thread" transform
		addResource(node.id+'_Transform_HTML', require('./transform.HTMLBodyAuto_typeMongoDB'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:GetTransform']
			, view$domain: {$list: [node.id]}
			, view$range: ['http://magnode.org/HTMLBody', 'http://magnode.org/HTMLBody_Auto']
			, view$nice: 1
			} );
		// TODO create a set of transforms for every "view" on a schema.
		// It needs to dereference links to references, and turn labels into links again (where they uniquely identify a resource). Among other things.
		addResource(node.id+'_Transform_JSON', require('./transform.Document_typeJSON'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:GetTransform']
			, view$domain: {$list: [node.id]}
			, view$range: ['http://magnode.org/Document', 'http://magnode.org/DocumentJSON', rdf.environment.createLiteral('media:application/json'), rdf.environment.createLiteral('view:info')]
			, view$nice: 1
			} );
		addResource(node.id+'_Transform_PutForm', require('./transform.HTMLBodyAuto_typeMongoDB_Form'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:GetTransform']
			, view$domain: {$list: [node.id, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody', 'http://magnode.org/HTMLBody_Form', 'http://magnode.org/DocumentTitle']
			, view$nice: 1
			} );
		addResource(node.id+'_Transform_PutJSONForm', require('./transform.HTMLBodyAuto_typeMongoDB_JSONForm'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:GetTransform']
			, view$domain: {$list: [node.id, 'http://magnode.org/UserSession', 'http://magnode.org/DocumentJSON']}
			, view$range: ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody_JSONForm', 'http://magnode.org/HTMLBody', 'http://magnode.org/DocumentTitle']
			, view$nice: 1
			} );
		addResource(node.id+'_Transform_DeleteForm', require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:GetTransform']
			, view$domain: {$list: [node.id, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody', 'http://magnode.org/DocumentTitle']
			, view$nice: 1
			} );
		addResource(node.id+'_Transform_Put', require('./transform.HTTPAuto_typeMongoDB_Put'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:PutTransform', 'view:DeleteTransform']
			, view$domain: {$list: [node.id, 'http://magnode.org/UserSession']}
			, view$range: 'http://magnode.org/HTTPResponse'
			, view$nice: 1
			} );
		addResource(node.id+'_Transform_Post', require('./transform.HTTPAuto_typeFormData_Post'),
			{ $context: context
			, a: ['view:Transform', 'view:MongoDBJSONSchemaTransform', 'view:PostTransform']
			, view$domain: {$list: [node.id, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTTPResponse', 'http://magnode.org/HTTPResponse_PutFn']
			, view$nice: 1
			} );
	}
	function rsEnd(err){
		if(err) throw err;
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	}
	// To be attached to HTTPAuto_typeMongoDB_Put_Object
	function IndexMongoDBRoutes(fndb, transform, resources, render, document, schema, links){
		function filter(u){
			// FIXME verify that u.subject===resource being updated
			if(u.predicate.toString()!=='http://www.iana.org/assignments/relation/type') return false;
			if(u.object.toString()==='http://magnode.org/MongoDBJSONSchema') return true;
		}
		if(!links.some(filter)) return;
		updateSchema(document.collection, document);
	};
	return {route:routeRequest, indexer:IndexMongoDBRoutes};
}
