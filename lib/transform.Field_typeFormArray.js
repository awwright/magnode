var url=require('url');

module.exports = require('./transform.Field_typeFormObject').generateTransform('Array');
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/Array']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueArray']
	};
