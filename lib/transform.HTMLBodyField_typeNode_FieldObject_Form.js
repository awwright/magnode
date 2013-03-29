var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var ObjectId = require('mongolian').ObjectId;

module.exports = require('./transform.HTMLBodyField_typeNode_FieldObject').generateTransform('object', 'FormTransform');
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject_Form';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
