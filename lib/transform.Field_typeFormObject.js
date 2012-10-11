var util=require('util');
var url=require('url');
var render=require('./render');
var ObjectId = require('mongolian').ObjectId;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var fieldData = input["http://magnode.org/FormFieldData"];

	try {
		if(!fieldData||!fieldData[baseName+'fields']) throw new Error("Invalid form information");
		var fieldNames = JSON.parse(fieldData[baseName+'fields']);
		if(!fieldNames instanceof Array) throw new Error("Fields not listed");
	} catch(e){
		callback(e);
		return;
	}
	parseFields(fieldData, {}, fieldNames, {}, haveParsedFields);

	function parseFields(fieldData, node, fieldList, document, cb){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return cb(null, document);

		var targetType = 'http://magnode.org/MongoDBValue';
		var resources = {'http://magnode.org/FormFieldData': input["http://magnode.org/FormFieldData"]};
		resources['http://magnode.org/FormFieldElementObject'] = {name:''};
		transformTypes = ['http://magnode.org/view/FormDataTransform'];

		var value = fieldData[baseName+'value.'+fieldName];
		var type = url.resolve('http://magnode.org/',fieldData[baseName+'.'+fieldName+'.format']);

		var targetType = 'http://magnode.org/MongoDBValue';
		var resources = {'http://magnode.org/FormFieldData': input["http://magnode.org/FormFieldData"]};
		for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];

		switch(fieldData[baseName+'.'+fieldName+'.format']){
			case 'ObjectId': document[fieldName] = value?new ObjectId(value):undefined; break;
			case 'date': document[fieldName] = (value.toLowerCase()=='now')?new Date():new Date(value); break;
			case 'checkbox': document[fieldName] = (value=='1')?true:false; break;
			case 'noop':
				break;
			case 'undefined':
				break;
		}

		resources[type] = {name:baseName+'value.'+fieldName};
		transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedForm);
		function haveRenderedField(err, resources){
			if(err) return callback(err);
			var fieldData = input["http://magnode.org/FieldValue"];
			if(fieldData){
				console.log(fieldData);
				renderedFields[fieldName] = res[targetType];
			}else{
				return cb(new Error('No parsed field returned for '+fieldName));
			}
			renderFields(properties, node, fieldList, renderedFields, cb);
		}

		parseFields(fieldData, node, fieldList, document, cb);
	}

	function haveParsedFields(err, document){
		if(err) return callback(err);
		var ret = {};
		for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = document;
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/MongoDBValue_typeFormFieldElementObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementObject']}
	, 'view:range': 'type:FieldValue'
	}
