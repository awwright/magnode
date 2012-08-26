/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/


module.exports.scanMongoCollection = function(db, render, cb){
	var triples = [];

	function addTriple(s,p,o){
		var f = require('rdf').environment.createTriple(s,p,o);
		triples.push(f);
		render.db.add(f);
	}

	db.find({type:"http://magnode.org/MongoDBJSONSchema"}).forEach(function(node){
		console.log('%s %s', node._id, node.subject);
		var options = node.ViewTransform;
		if(options && options.page&& options.page.type){
			switch(options.page.type){
				case 'jade': options.page.type='http://magnode.org/view/Jade'; break;
			}
			var uri = node.subject+'_Transform_Body'
			if(options.page.module) render.renders[uri]=require(options.page.module);
			addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
			addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ViewTransform');
			if(options.page.type) addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', options.page.type);
			if(options.page.file) addTriple(uri, 'http://magnode.org/view/file', options.page.file);
			addTriple(uri, 'http://magnode.org/view/domain', node.subject);
			addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/DocumentHTML_Body');
			addTriple(uri, 'http://magnode.org/view/cache', 'http://magnode.org/cache/json');
		}

		var uri = node.subject+'_Transform_Form'
		render.renders[uri]=require('./transform.DocumentHTML_BodyAuto_typeMongoDB_Form');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/FormTransform');
		addTriple(uri, 'http://magnode.org/view/module', '');
		addTriple(uri, 'http://magnode.org/view/domain', node.subject);
		addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/DocumentHTML_Body');

		var uri = node.subject+'_Transform_Post'
		render.renders[uri]=require('./transform.DocumentHTML_BodyAuto_typeMongoDB_Post');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/PostTransform');
		addTriple(uri, 'http://magnode.org/view/domain', node.subject);
		addTriple(uri, 'http://magnode.org/view/domain', 'http://magnode.org/FormFieldData');
		addTriple(uri, 'http://magnode.org/view/domain', 'http://magnode.org/UserSession');
		addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/HTTPResponse');

	}, function(err){
		if(err) throw err;
		//triples.forEach(function(v){console.log('    '+v);});
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	});
}
