var util=require('util');
var url=require('url');
var EventEmitter=require('events').EventEmitter;
var render=require('./render');
var ObjectId = require('mongolian').ObjectId;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/FormFieldElementObject'];

	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var fieldData = input["http://magnode.org/FormFieldData"];

	var document = {};
	var selfObject = new EventEmitter;

	try {
		if(!fieldData||!fieldData[baseName+'fields']) throw new Error("Invalid form information");
		var fieldNames = JSON.parse(fieldData[baseName+'fields']);
		if(!fieldNames instanceof Array) throw new Error("Fields not listed");
	} catch(e){
		return callback(e);
	}
	parseFields(fieldNames);

	function parseFields(fieldList){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return haveParsedFields();

		var value = fieldData[baseName+fieldName+'.value'];
		var format = fieldData[baseName+fieldName+'.format']||'undefined';
		var type = url.resolve('http://magnode.org/',format);

		switch(format){
			case 'ObjectId':
				document[fieldName] = value?new ObjectId(value):undefined;
				return parseFields(fieldList);
			case 'date':
				document[fieldName] = (value.toLowerCase()=='now')?new Date():new Date(value);
				return parseFields(fieldList);
			case 'checkbox':
				document[fieldName] = (value=='1')?true:false;
				return parseFields(fieldList);
			case 'noop':
				return parseFields(fieldList);
		}

		var targetType = 'http://magnode.org/FieldValue';
		var resources = Object.create(input.requestenv);
		resources[type] = {name:baseName+fieldName};
		resources['http://magnode.org/FormFieldData'] = input["http://magnode.org/FormFieldData"];
		resources.object = selfObject;
		var transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedField);
		function haveRenderedField(err, result){
			if(err) return callback(err);
			var fieldData = result[targetType];
			if(fieldData===undefined){
				return callback(new Error('No parsed field returned for '+fieldName));
			}
			document[fieldName] = fieldData;
			parseFields(fieldList);
		}
	}

	function haveParsedFields(err){
		// Let some hooks modify the data
		try{ selfObject.emit('parsed', document); }
		catch(e){ return callback(e); }
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=document;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementObject']}
	, 'view:range': 'type:FieldValue'
	}
