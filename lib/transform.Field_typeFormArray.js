var url=require('url');

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/fieldpost/Array'];

	var arrLength = parseInt(inputData[inputElement.name+'.length']);
	if(!(arrLength>=0)) return void callback(new Error('Invalid Array length'));
	var value = [];

	parseFields(0);

	function parseFields(fieldItem){
		if(fieldItem>=arrLength) return parseFieldsFinished();

		var targetType = 'http://magnode.org/FieldValue';
		var resources = {'http://magnode.org/FormFieldData': inputData};
		var itemFormat = inputData[inputElement.name+'.'+fieldItem+'.format'];
		if(!itemFormat) return parseFields(fieldItem+1);
		var itemType = url.resolve('http://magnode.org/fieldpost/', itemFormat);
		resources[itemType] = {name:inputElement.name+'.'+fieldItem};
		transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveParsedField);
		function haveParsedField(err, resources){
			if(err) return void callback(err);
			var fieldData = resources[targetType];
			if(fieldData){
				value.push(fieldData);
			}else{
				//return void callback(new Error('No parsed field returned for '+inputElement.name+'.'+fieldItem));
			}
			parseFields(fieldItem+1);
		}
	}

	function parseFieldsFinished(){
		var ret = {};
		outputTypes.forEach(function(v){ret[v] = value;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/Array']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueArray']
	};
