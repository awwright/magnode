module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementString'];

	var value = inputData[inputElement.name+'.value'];

	var ret = {};
	outputTypes.forEach(function(v){ret[v] = value;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementString';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementString']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueString']
	};
