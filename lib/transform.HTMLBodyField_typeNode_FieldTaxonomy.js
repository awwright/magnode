var util=require('util');
var url=require('url');

var render=require('./render');

module.exports = function generateTransform(db, transform, input, render, callback){
	var field = input['http://magnode.org/field/Taxonomy'];
	var items = field.value;
	var bins = [];
	bins.push([]);
	end();
	function end(){
		var value = '<ul>'+items.map(function(v){return '<li>'+v+'</li>';}).join('')+'</ul>';
		var outputs = {};
		outputs['http://magnode.org/HTMLBodyField'] = value;
		callback(null, outputs);
	}
}

module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldTaxonomy';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['http://magnode.org/field/Taxonomy']}
	, 'view:range': 'type:HTMLBodyField'
	}
