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
require('./transform.HTTPAuto_typeMongoDB_Delete');

module.exports.hypermetaschema = {
	links: [
		{ rel:'self', href:'{+id}' },
		{ rel:'type', href:'http://magnode.org/MongoDBJSONSchema' },
	]
};
var schemaType = 'http://magnode.org/MongoDBJSONSchema';

// TODO Create an indexer that watches for Schema changes and modifies `db` and `routes` and such as appropriate
// This avoids the need for restarting the server.
module.exports.scanMongoCollection = function(db, dbSchema, render, cb){
	function addTriple(s,p,o){
		// FIXME this is only a quick fix for convenience
		// We should always be passed an RDFNode
		if(typeof s=='string') s=rdf.environment.createNamedNode(s);
		if(typeof p=='string') p=rdf.environment.createNamedNode(p);
		if(typeof o=='string') o=rdf.environment.createNamedNode(o);
		var f = rdf.environment.createTriple(s,p,o);
		render.db.add(f);
	}
	function addResource(s,f,o){
		if(f) render.renders[s] = f;
		rdf.parse(o, s).graphify().forEach(function(t){ render.db.add(t); });
	}

	// Create a URL router to use
	var routes = [];
	var schemas = {};
	function routeRequest(resource, found){
		// Maybe ensure that every argument in the query string is handled, or else send a 404
		// That might violate the notion of ignore-unknown-headers, but then again,
		// people shouldn't be creating properties we didn't let them
		var requiredTypeMap = {
			'edit': ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody'],
			'put.fn': ['http://magnode.org/HTTPResponse_PutFn'],
			'delete': ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody'],
			'delete.fn': ['http://magnode.org/HTTPResponse_DeleteFn'],
		}
		var variant = queryVariant(resource, requiredTypeMap);
		variant.requiredTypes = variant.requiredTypes||{};

		var matches = [];
		routes.forEach(function(route){
			var m = route.template.fromUri(variant.resource);
			// TODO Coerce m.filter into validating against m.route.schema here
			if(m) matches.push([m, route]);
		});
		findNext(0);

		function findNext(i){
			var v = matches[i];
			var route = v[1];
			if(!v || !route.collection) return void found();
			db.collection(route.collection).findOne(v[0], function(err, record){
				if(err) return void found(err);
				if(!record) return void findNext(i+1);
				record = mongoutils.unescapeObject(record);
				var variants = {};
				route.types.forEach(function(t){ variants[t.fillFromObject(record)] = record; });
				if(variants[schemaType] && 'new' in variant.params){
					var schema = variants[schemaType];
					var instanceVariants = {};
					if(schema && schema.schema) schema = schema.schema;
					// Search for a schema at variant.resource
					// Create an instance of it
					var instance = {};
					if(schema.links instanceof Array){
						schema.links.forEach(function(t){
							if(t.rel!=='type') return;
							var type = new Uritpl(t.href).fillFromObject(instance);
							instanceVariants[type] = instance;
						});
					}
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

			found(null, variants);
		}
	}

	var filter = {};
	// var filter = {type:"http://magnode.org/MongoDBJSONSchema", subject:{$exists:true}};
	dbSchema.find(filter).each(function(err, doc){
		if(err) rsEnd(err);
		else if(doc) rsEach(doc);
		else rsEnd();
	});
	function rsEach(node){
		node = mongoutils.unescapeObject(node);
		var schema = node.schema || node;
		if(schema.type!=='object'){
			console.error('Unacceptable schema '+node._id+':', node);
			return;
		}
		var selfLinks = [];
		module.exports.hypermetaschema.links.forEach(function(tpl){
			if(tpl.rel==='self'){
				var uri = new Uritpl(tpl.href).fillFromObject(node);
				selfLinks.push(uri);
				schemas[uri] = node;
			}
		});
		console.log('MongoDBJSONSchema import: %s %s', node._id, selfLinks[0]);
		if(!selfLinks.length){
			console.error('No URI given to schema schema %s', node._id);
			return;
		}
		var links = node.schema&&node.schema.links || node.links;
		if(links instanceof Array){
			var types = [];
			links.forEach(function(v){
				if(v.rel!=='type') return;
				console.log('Link: <'+node.subject+'> a <'+v.href+'> .');
				// TODO resolve v.href against a URI base... This probably has to be done in route()
				types.push(new Uritpl(v.href));
			});
			links.forEach(function(v){
				if(v.rel!=='self') return;
				console.log('Link: <'+node.subject+'> rel:self <'+v.href+'> .');
				routes.push({template:new Uritpl(v.href), types:types, collection:node.collection, definition:node, schema:schema});
			});
		}
		// TODO all of these addResource calls should be plugable
		// e.g. especially a "Get comment thread" transform
		var options = node.ViewTransform;
		if(options && options.page && options.page.type){
			var uri = node.subject+'_Transform_Body'
			if(options.page.module) var bodyrender=require(options.page.module);
			addResource(uri, bodyrender,
				{ $context: context
				, a: ['view:Transform', 'view:GetTransform']
				, view$domain: {$list: [node.subject]}
				, view$range: node.range||'http://magnode.org/HTMLBody'
				, view$cache: 'http://magnode.org/cache/json'
				} );

			switch(options.page.type){
				case 'jade': options.page.type='http://magnode.org/view/Jade'; break;
			}
			if(options.page.type) addTriple(uri, rdf.rdfns('type'), options.page.type);
			if(options.page.file) addTriple(uri, 'http://magnode.org/view/file', options.page.file);
		}
		addResource(node.subject+'_Transform_HTML', require('./transform.HTMLBodyAuto_typeMongoDB'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform']
			, view$domain: {$list: [node.subject]}
			, view$range: ['http://magnode.org/HTMLBody', 'http://magnode.org/HTMLBody_Auto']
			, view$nice: 1
			} );
		// TODO create a set of transforms for every "view" on a schema.
		// It needs to dereference links to references, and turn labels into links again (where they uniquely identify a resource). Among other things.
		addResource(node.subject+'_Transform_JSON', require('./transform.Document_typeJSON'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform']
			, view$domain: {$list: [node.subject]}
			, view$range: ['http://magnode.org/Document', 'http://magnode.org/DocumentJSON', rdf.environment.createLiteral('media:application/json'), rdf.environment.createLiteral('view:info')]
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_Form', require('./transform.HTMLBodyAuto_typeMongoDB_Form'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody']
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_DeleteForm', require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody']
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_Put', require('./transform.HTTPAuto_typeMongoDB_Put'),
			{ $context: context
			, a: ['view:Transform', 'view:PutTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: 'http://magnode.org/HTTPResponse'
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_Post', require('./transform.HTTPAuto_typeFormData_Post'),
			{ $context: context
			, a: ['view:Transform', 'view:PostTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: ['http://magnode.org/HTTPResponse', 'http://magnode.org/HTTPResponse_PutFn']
			, view$nice: 0
			} );
		addResource(node.subject+'_Transform_Delete', require('./transform.HTTPAuto_typeMongoDB_Delete'),
			{ $context: context
			, a: ['view:Transform', 'view:DeleteTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: 'http://magnode.org/HTTPResponse'
			, view$nice: 0
			} );
	}
	function rsEnd(err){
		if(err) throw err;
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	}
	return {route:routeRequest};
}
