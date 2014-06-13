/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/

var rdf=require('rdf');
var context = {view:'http://magnode.org/view/'};

var Uritpl = require('uri-templates');

var queryVariant = require('./queryvariant').parseUriVariants;

require('./transform.HTMLBodyAuto_typeMongoDB');
require('./transform.Document_typeJSON');
require('./transform.HTMLBodyAuto_typeMongoDB_Form');
require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm');
require('./transform.Document_typeStream');
require('./transform.JSON_typeDocument');
require('./transform.HTTPAuto_typeMongoDB_Put');
require('./transform.HTTPAuto_typeFormData_Post');
require('./transform.HTTPAuto_typeMongoDB_Delete');
require('./transform.ResourceMenuAuto_typeNode');

module.exports.scanMongoCollection = function(db, dbSchema, render, cb){
	function addTriple(s,p,o){
		var f = rdf.environment.createTriple(s,p,o);
		render.db.add(f);
	}
	function addResource(s,f,o){
		if(f) render.renders[s] = f;
		o.ref(s).graphify().forEach(function(t){render.db.add(t);});
	}

	// Create a URL router to use
	var routes = [];
	function routeRequest(resource, found){
		var variant = queryVariant(resource);
		var requiredTypes = variant.requiredTypes = variant.requiredTypes||{};
		// FIXME schemas should be able to define their own views
		if('edit.form' in variant.params){
			requiredTypes['http://magnode.org/HTMLBody'] = true;
			requiredTypes['http://magnode.org/HTMLBody.Form'] = true;
		}
		var matches = [];
		routes.forEach(function(route){
			var m = route.template.fromUri(variant.resource);
			if(m) matches.push([m, route]);
		});
		// TODO Coerce m.filter into validating by m.route.schema here
		function findNext(i){
			var v = matches[i];
			if(!v) return void found();
			var route = v[1];
			db.collection(route.collection).findOne(v[0], function(err, record){
				if(err) return void found(err);
				if(!record) return void findNext(i+1);
				var ret = {};
				ret.variant = variant;
				ret[rdf.environment.resolve(':Published')] = 1;
				route.types.forEach(function(t){ ret[t.fillFromObject(record)] = record; });
				found(null, ret);
			});
		}
		findNext(0);
	}

	var filter = {};
	// var filter = {type:"http://magnode.org/MongoDBJSONSchema", subject:{$exists:true}};
	dbSchema.find(filter).each(function(err, doc){
		if(err) rsEnd(err);
		else if(doc) rsEach(doc);
		else rsEnd();
	});
	function rsEach(node){
		console.log('Class import: %s %s', node._id, node.subject);
		if(!node.subject){
			console.error('No subject property found in this schema');
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
				routes.push({template:new Uritpl(v.href), pattern:v.href, types:types, collection:node.collection});
			});
		}
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
		}else{
			addResource(node.subject+'_Transform', require('./transform.HTMLBodyAuto_typeMongoDB'),
				{ $context: context
				, a: ['view:Transform', 'view:GetTransform']
				, view$domain: {$list: [node.subject]}
				, view$range: ['http://magnode.org/HTMLBody', 'view:info'.l()]
				, view$nice: 1
				} );
		}
		addResource(node.subject+'_Transform_JSON', require('./transform.Document_typeJSON'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform']
			, view$domain: {$list: [node.subject]}
			, view$range: ['http://magnode.org/Document', 'http://magnode.org/DocumentJSON', 'media:application/json'.l(), 'view:info'.l()]
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_Form', require('./transform.HTMLBodyAuto_typeMongoDB_Form'),
			{ $context: context
			, a: ['view:Transform', 'view:PutFormTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: 'http://magnode.org/HTMLBody'
			, view$nice: 1
			} );
		addResource(node.subject+'_Transform_DeleteForm', require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm'),
			{ $context: context
			, a: ['view:Transform', 'view:DeleteFormTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession']}
			, view$range: 'http://magnode.org/HTMLBody'
			} );
		addResource(node.subject+'_Transform_Put_Stream', require('./transform.Document_typeStream'),
			{ $context: context
			, a: ['view:Transform', 'view:PutTransform']
			, view$domain: {$list: [('request:application/json;profile='+node.subject).l()]}
			, view$range: [('media:application/json;profile='+node.subject).l()]
			, view$nice: 0
			} );
		addResource(node.subject+'_Transform_Put_Parse', require('./transform.JSON_typeDocument'),
			{ $context: context
			, a: ['view:Transform', 'view:PutTransform']
			, view$domain: {$list: [('media:application/json;profile='+node.subject).l()]}
			, view$range: [node.subject]
			, view$nice: 0
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
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession', 'http://magnode.org/FormFieldData']}
			, view$range: 'http://magnode.org/HTTPResponse'
			} );
		addResource(node.subject+'_Transform_Delete', require('./transform.HTTPAuto_typeMongoDB_Delete'),
			{ $context: context
			, a: ['view:Transform', 'view:DeleteTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession', 'http://magnode.org/FormFieldData']}
			, view$range: 'http://magnode.org/HTTPResponse'
			} );
		addResource(node.subject+'_Transform_ResourceMenu', require('./transform.ResourceMenuAuto_typeNode'),
			{ $context: context
			, a: ['view:Transform', 'view:GetTransform', 'view:PutFormTransform', 'view:DeleteFormTransform']
			, view$domain: {$list: [node.subject]}
			, view$range: 'http://magnode.org/ResourceMenu'
			, view$nice: 1
			} );
	}
	function rsEnd(err){
		if(err) throw err;
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	}
	return routeRequest;
}
