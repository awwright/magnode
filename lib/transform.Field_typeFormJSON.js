module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementJSON'];
	try{
		var value = JSON.parse(inputData[inputElement.name+'.value']);
	}catch(e){
		return callback(e);
	}
	var ret = {};
	outputTypes.forEach(function(v){ret[v] = value;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementJSON';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementJSON']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueJSON']
	};
