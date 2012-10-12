module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementJSON'];

	var arrLength = parseInt(fieldData[inputElement.name+'.length']);
	if(!arrLength) return callback(new Error('Invalid Array length'));
	var itemFormat = parseInt(fieldData[inputElement.name+'.itemformat']);
	var value = [];

	parseFields(fieldData, {}, 0, {}, haveParsedFields);

	function parseFields(fieldData, node, fieldItem, cb){
		if(fieldItem>=arrLength) return finished();

		var resources = {'http://magnode.org/FormFieldData': input["http://magnode.org/FormFieldData"]};
		resources[itemFormat] = {name:baseName+'value.'+fieldName};
		transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedForm);
		function haveRenderedField(err, resources){
			if(err) return callback(err);
			var fieldData = input["http://magnode.org/FieldValue"];
			if(fieldData){
				value[i] = fieldData;
			}else{
				return cb(new Error('No parsed field returned for '+fieldName));
			}
			renderFields(properties, node, fieldList, renderedFields, cb);
		}
	}

	function finished(){
		var ret = {};
		for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = value;
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/MongoDBValue_typeFormFieldElementArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementJSON']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueJSON']
	};
