/*
Load transforms to handle the display of registered `MongoDBJSONSchema`s
*/


module.exports.scanMongoCollection = function(db, transformDb, cb){
	var triples = [];

	function addTriple(s,p,o){
		var f = require('rdf').environment.createTriple(s,p,o);
		triples.push(f);
		transformDb.add(f);
	}

	db.find({type:"http://magnode.org/MongoDBJSONSchema"}).forEach(function(node){
		console.log('%s %s', node._id, node.subject);
		var render = node.ViewTransform;
		if(render && render.page&& render.page.type){
			switch(render.page.type){
				case 'jade': render.page.type='http://magnode.org/view/Jade'; break;
				case 'module': render.page.type='http://magnode.org/view/ModuleTransform'; break;
			}
			var uri = node.subject+'_Transform_Body'
			addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
			addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ViewTransform');
			addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', render.page.type);
			if(render.page.file) addTriple(uri, 'http://magnode.org/view/file', render.page.file);
			if(render.page.module) addTriple(uri, 'http://magnode.org/view/module', render.page.module);
			addTriple(uri, 'http://magnode.org/view/domain', node.subject);
			addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/DocumentHTML_Body');
			addTriple(uri, 'http://magnode.org/view/cache', 'http://magnode.org/cache/json');
		}

		var uri = node.subject+'_Transform_Form'
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ModuleTransform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/FormTransform');
		addTriple(uri, 'http://magnode.org/view/module', 'magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Form');
		addTriple(uri, 'http://magnode.org/view/domain', node.subject);
		addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/DocumentHTML_Body');

		var uri = node.subject+'_Transform_Post'
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ModuleTransform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/PostTransform');
		addTriple(uri, 'http://magnode.org/view/module', 'magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Post');
		addTriple(uri, 'http://magnode.org/view/domain', node.subject);
		addTriple(uri, 'http://magnode.org/view/domain', 'http://magnode.org/FormFieldData');
		addTriple(uri, 'http://magnode.org/view/domain', 'http://magnode.org/UserSession');
		addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/HTTPResponse');

		var tableType = node.tableType||node.subject+'Table';
		var uri = node.subject+'_Transform_Table'
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ModuleTransform');
		addTriple(uri, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/ViewTransform');
		addTriple(uri, 'http://magnode.org/view/module', 'magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Table');
		addTriple(uri, 'http://magnode.org/view/domain', tableType);
		addTriple(uri, 'http://magnode.org/view/range', 'http://magnode.org/DocumentHTML_Body');

	}, function(err){
		if(err) throw err;
		//triples.forEach(function(v){console.log('    '+v);});
		console.log('Done scanning database for content types');
		if(typeof cb=='function') cb();
	});
}
