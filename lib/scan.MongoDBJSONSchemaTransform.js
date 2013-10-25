/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/

var rdf=require('rdf');
rdf.setBuiltins();
var context = {view:'http://magnode.org/view/'};

require('./transform.HTMLBodyAuto_typeMongoDB');
require('./transform.Document_typeJSON');
require('./transform.HTMLBodyAuto_typeMongoDB_Form');
require('./transform.HTMLBodyAuto_typeMongoDB_DeleteForm');
require('./transform.Document_typeStream');
require('./transform.JSON_typeDocument');
require('./transform.HTTPAuto_typeMongoDB_Put');
require('./transform.HTTPAuto_typeMongoDB_Post');
require('./transform.HTTPAuto_typeMongoDB_Delete');
require('./transform.ResourceMenuAuto_typeNode');

module.exports.scanMongoCollection = function(db, render, cb){
	function addTriple(s,p,o){
		var f = rdf.environment.createTriple(s,p,o);
		render.db.add(f);
	}
	function addResource(s,f,o){
		if(f) render.renders[s] = f;
		o.ref(s).graphify().forEach(function(t){render.db.add(t);});
	}
	db.find({type:"http://magnode.org/MongoDBJSONSchema", subject:{$exists:true}}).forEach(function(node){
		console.log('Class import: %s %s', node._id, node.subject);
		if(node.schema.links instanceof Array){
			node.schema.links.forEach(function(v){
				if(v.rel!=='self') return;
				console.log('<'+node.subject+'> Link: <'+v.href+'>; rel=self');
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
		addResource(node.subject+'_Transform_Post', require('./transform.HTTPAuto_typeMongoDB_Post'),
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
	}, function(err){
		if(err) throw err;
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	});
}
