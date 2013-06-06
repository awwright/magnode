var util=require('util');
var url=require('url');
var render=require('./render');

module.exports = function generateTransform(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/fieldpost/ConcatArray'];
	var fieldData = input['http://magnode.org/FormFieldData'];
	var result = [];
	var length = parseInt(fieldData[inputResource.name+'.length']);

	function renderField(i){
		if(i>=length) return void haveRenderedFields();
		var fieldName = inputResource.name+'.'+i;
		var format = fieldData[fieldName+'.format'];
		if(!format) return void callback(new Error('Format not provided for '+fieldName));
		var type = url.resolve('http://magnode.org/fieldpost/',format);

		switch(format){
			case 'checkbox':
				renderedValues[fieldName] = (fieldData[fieldName+'.value']=='1')?true:false;
				return void parseFields(fieldList);
			case 'noop':
				return void parseFields(fieldList);
		}

		var targetType = 'http://magnode.org/FieldValue';
		var resources = Object.create(Object.getPrototypeOf(input));
		resources[type] = {name:fieldName};
		resources['http://magnode.org/FormFieldData'] = input["http://magnode.org/FormFieldData"];
		var transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedField);
		function haveRenderedField(err, parsed){
			if(err) return void callback(err);
			var fieldData = parsed[targetType];
			if(fieldData!==undefined){
				if(fieldData instanceof Array) fieldData.forEach(function(v){ if(v!==undefined) result.push(v); });
				else result.push(fieldData);
			}
			renderField(i+1);
		}
	}

	function haveRenderedFields(){
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}

	renderField(0);
}

module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementConcatArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/ConcatArray']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueConcatArray']
	};
