var util=require('util');
var url=require('url');

module.exports = require('./transform.HTMLBodyField_typeNode_FieldObject').generateTransform('array', 'ViewTransform');
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldArray';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['http://magnode.org/field/array']}
	, 'view:range': 'type:HTMLBodyField'
	}
