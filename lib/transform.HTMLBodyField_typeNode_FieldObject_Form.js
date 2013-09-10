var util=require('util');
var url=require('url');

module.exports = require('./transform.HTMLBodyField_typeNode_FieldObject').generateTransform('object', 'PutFormTransform');
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject_Form';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
