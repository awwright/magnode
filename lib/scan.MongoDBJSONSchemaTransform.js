/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/

var rdf=require('rdf');
rdf.setBuiltins();
var context = {view:'http://magnode.org/view/'};

module.exports.scanMongoCollection = function(db, render, cb){
	function addTriple(s,p,o){
		var f = rdf.environment.createTriple(s,p,o);
		render.db.add(f);
	}
	function addResource(s,f,o){
		if(f) render.renders[s] = f;
		o.ref(s).graphify().forEach(function(t){render.db.add(t);});
	}
	db.find({type:"http://magnode.org/MongoDBJSONSchema"}).forEach(function(node){
		console.log('Class import: %s %s', node._id, node.subject);
		var options = node.ViewTransform;
		if(options && options.page&& options.page.type){
			var uri = node.subject+'_Transform_Body'
			if(options.page.module) var bodyrender=require(options.page.module);
			addResource(uri, bodyrender,
				{ $context: context
				, a: ['view:Transform', 'view:ViewTransform']
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
		addResource(node.subject+'_Transform_Form', require('./transform.HTMLBodyAuto_typeMongoDB_Form'),
			{ $context: context
			, a: ['view:Transform', 'view:FormTransform']
			, view$domain: {$list: [node.subject]}
			, view$range: 'http://magnode.org/HTMLBody'
			} );
		addResource(node.subject+'_Transform_Post', require('./transform.HTMLBodyAuto_typeMongoDB_Post'),
			{ $context: context
			, a: ['view:Transform', 'view:PostTransform']
			, view$domain: {$list: [node.subject, 'http://magnode.org/UserSession', 'http://magnode.org/FormFieldData']}
			, view$range: 'http://magnode.org/HTTPResponse'
			} );
	}, function(err){
		if(err) throw err;
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	});
}
