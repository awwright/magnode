var rdf=require('rdf');

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementToken'];

	// Why don't we have access to the schema? hm
	var value = undefined;
	var ret = {};
	outputTypes.forEach(function(v){ret[v] = value;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementToken';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform', 'view:Core']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/Token']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueToken']
	};
