var util=require('util');
var url=require('url');
var EventEmitter=require('events').EventEmitter;
var render=require('./render');
var ObjectId = require('mongolian').ObjectId;

// This transform should be called by view when a ModuleTransform calls for this module
function generateTransform(viewType){ return function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/fieldpost/'+viewType];

	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var fieldData = input["http://magnode.org/FormFieldData"];

	var document = (viewType=='Array')?[]:{};
	var selfObject = new EventEmitter;

	var fieldNames = {};
	var searchStr = baseName+'prop.';
	for(var f in fieldData){
		if(f.substring(0, searchStr.length)===searchStr){
			var end = f.indexOf('.', searchStr.length);
			if(end<0) end = f.length;
			fieldNames[f.substring(searchStr.length, end)] = null;
		}
	}
	fieldNames = Object.keys(fieldNames);

	var arrLength = parseInt(fieldData[baseName+'length']);
	if(arrLength) for(var i=0; i<arrLength; i++) fieldNames.push(i);
	if(fieldData[baseName+'new.format']) fieldNames.push(-1);
	parseFields(fieldNames);

	function parseFields(fieldList){
		var self=this;
		var fieldName = fieldList.shift();
		if(fieldName===undefined) return void haveParsedFields();

		if(fieldName===-1){
			var propertyName = arrLength;
			var fullName = baseName+'new';
		}else{
			var propertyName = fieldName;
			var fullName = ((typeof fieldName=='string')?searchStr:baseName)+fieldName;
		}
		var value = fieldData[fullName+'.value'];
		var format = fieldData[fullName+'.format'];
		if(!format) return void callback(new Error('Format not provided for '+fullName));
		var type = url.resolve('http://magnode.org/fieldpost/',format);

		if(format=='ObjectProperty' && viewType=='Object'){
			propertyName = fieldData[fullName+'.name'];
			if(!propertyName || propertyName.length===0) return void parseFields(fieldList);
			value = fieldData[fullName+'.value.value'];
			format = fieldData[fullName+'.value.format']||'undefined';
			type = url.resolve('http://magnode.org/fieldpost/',format);
			fieldName = fieldName+'.value';
		}

		switch(format){
			case 'checkbox':
				document[fieldName] = (value=='1')?true:false;
				return void parseFields(fieldList);
			case 'noop':
				return void parseFields(fieldList);
		}

		var targetType = 'http://magnode.org/FieldValue';
		var resources = Object.create(Object.getPrototypeOf(input));
		resources[type] = {name:fullName};
		resources['http://magnode.org/FormFieldData'] = input["http://magnode.org/FormFieldData"];
		resources.object = selfObject;
		var transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedField);
		function haveRenderedField(err, result){
			if(err) return void callback(err);
			var fieldData = result[targetType];
			if(fieldData!==undefined){
				document[propertyName] = fieldData;
			}
			parseFields(fieldList);
		}
	}

	function haveParsedFields(err){
		// Let some hooks modify the data
		try{ selfObject.emit('parsed', document); }
		catch(e){ return void callback(e); }
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=document;});
		callback(null, ret);
	}
} }

module.exports = generateTransform('Object');
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/Object']}
	, 'view:range': 'type:FieldValue'
	}

module.exports.generateTransform = generateTransform;
