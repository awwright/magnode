var util=require('util');
var url=require('url');
var EventEmitter=require('events').EventEmitter;
var render=require('./render');
var ObjectId = require('mongodb').ObjectID;

// This transform should be called by view when a ModuleTransform calls for this module
function generateTransform(viewType){ return function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/fieldpost/'+viewType];

	var baseName = inputResource.name;
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var fieldData = input["http://magnode.org/FormFieldData"];

	var selfObject = new EventEmitter;

	// Get a list of properties and their field names,
	// and fields to render the value of.

	// renderedValue[fieldName] = fieldValue
	var renderedValues = {};
	// List of fields to render
	var fieldNames = {};
	// List of fields that are properties
	var propertyFields = [];
	// List of fields that are array properties
	// Split out just so we can concat() it after propertyFields
	var propertyItems = [];

	var arrLength = parseInt(fieldData[baseName+':length']) || 0;
	// zero...arrLength inclusive
	for(var i=0; i<=arrLength;){
		var fieldName = baseName + '.' + (i==arrLength?':new':i);
		if(fieldData[fieldName+':name:format']){
			// Parse the property name
			fieldNames[fieldName+':name'] = null;
		}else if(fieldData[fieldName+':name']){
			// Custom property name specified, consider it already rendered
			renderedValues[fieldName+':name'] = fieldData[fieldName+':name'];
		}else if(fieldData[fieldName+':format']){
			// Use default property name, in this case, a number
			renderedValues[fieldName+':name'] = i;
		}else{
			i++;
			continue;
		}
		fieldNames[fieldName] = null;
		propertyItems.push(fieldName);
		// If the field is an element in a linked list, read the next item in the linked list
		if(fieldNames[fieldName+':next']){
			var nextItem = parseInt(fieldNames[fieldName+':next']);
		}
		if(nextItem>=0 && nextItem.toString()===fieldNames[fieldName+':next']){
			// Ensures that the "next" field !isNan and is in canonical form
			i = nextItem;
		}else{
			i++;
		}
	}

	// Try and calculate all the property names of this object
	for(var f in fieldData){
		// Exclude fields not starting with baseName
		if(f.substring(0, baseName.length) !== baseName) continue;
		// Field must be a property (starting with ".")
		if(f[baseName.length] !== '.') continue;
		var end = f.indexOf('.', baseName.length+1);
		if(end<0) end = f.length;
		var fieldName = f.substring(0, end);
		// Fields with : are special, don't count them
		if(fieldName.indexOf(':')>=0) continue;
		if(fieldNames[fieldName]!==undefined) continue;
		if(fieldData[fieldName+':name:format']){
			// Parse the property name
			fieldNames[fieldName+':name'] = null;
		}else if(fieldData[fieldName+':name']){
			// Custom property name specified, consider it already rendered
			renderedValues[fieldName+':name'] = fieldData[fieldName+':name'];
		}else if(fieldData[fieldName+':format']){
			// No custom name given, use default property name, consider it already rendered
			renderedValues[fieldName+':name'] = fieldName.substring(baseName.length+1, end);
		}else{
			continue;
		}
		fieldNames[fieldName] = null;
		propertyFields.push(fieldName);
	}
	propertyFields = propertyFields.concat(propertyItems);

	parseFields(Object.keys(fieldNames));

	function parseFields(fieldList){
		var self=this;
		var fieldName = fieldList.shift();
		if(fieldName===undefined) return void haveParsedFields();

		var format = fieldData[fieldName+':format'];
		if(!format) return void callback(new Error('Format not provided for '+fieldName));
		var type = url.resolve('http://magnode.org/fieldpost/',format);

		switch(format){
			case 'checkbox':
				renderedValues[fieldName] = (fieldData[fieldName]=='1')?true:false;
				return void parseFields(fieldList);
			case 'noop':
				return void parseFields(fieldList);
		}

		var targetType = 'http://magnode.org/FieldValue';
		var resources = Object.create(Object.getPrototypeOf(input));
		resources[type] = {name:fieldName};
		resources['http://magnode.org/FormFieldData'] = input["http://magnode.org/FormFieldData"];
		resources.object = selfObject;
		var transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, resources, transformTypes, haveRenderedField);
		function haveRenderedField(err, result){
			if(err) return void callback(err);
			var fieldData = result[targetType];
			if(fieldData!==undefined){
				renderedValues[fieldName] = fieldData;
			}
			parseFields(fieldList);
		}
	}

	function haveParsedFields(err){
		var document = (viewType=='Array')?[]:{};
		propertyFields.forEach(function(fieldName){
			var n = renderedValues[fieldName+':name'];
			if(n===undefined) return;
			document[n] = renderedValues[fieldName];
		});
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
