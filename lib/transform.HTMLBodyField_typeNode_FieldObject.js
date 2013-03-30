var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var ObjectId = require('mongolian').ObjectId;

function generateTransform(valueType, outputType){
return function HTMLBodyField_typeNode_FieldObject(db, transform, resources, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = resources['http://magnode.org/field/'+valueType];

	// If you have field names that include a period, you're gonna have a bad time
	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var schemaBase = inputResource.base;
	var properties = inputResource.properties||{};

	var tail = [];
	var nodeFields = Object.keys(properties);
	var nodeProperties = {};
	var len = 0;
	for(var n in value) if(properties[n]===undefined){ nodeFields.push(n); nodeProperties[n]=(len++)+'.value'; }
	renderFields(properties, nodeFields, {});

	function renderFields(properties, fieldList, renderedFields){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return void haveRenderedFields(null, renderedFields, properties);
		var propertySchema = properties[fieldName] || inputResource.additionalProperties || {};
		if(propertySchema.$ref && resources.jsonschema){
			propertySchema = resources.jsonschema.getSchema(url.resolve(schemaBase, propertySchema.$ref));
		}
		var targetType = 'http://magnode.org/HTMLBodyField';

		var formatMap =
			{  "uri": 'http://magnode.org/field/URI'
			,  "date": 'http://magnode.org/field/Date'
			};
		var typeMap =
			{  "array": 'http://magnode.org/field/array'
			,  "object": 'http://magnode.org/field/object'
			,  "boolean": 'http://magnode.org/field/Label'
			,  "string": 'http://magnode.org/field/Label'
			,  "number": 'http://magnode.org/field/Number'
			,  "integer": 'http://magnode.org/field/Number'
			,  "date": 'http://magnode.org/field/Date'
			};
		var fieldType = propertySchema.widget || formatMap[propertySchema.format] || typeMap[propertySchema.type];
		// Some builtin JSON formats need to be mapped to URIs
		var builtinMap =
			{ uri: 'http://magnode.org/field/URI'
			, json: 'http://magnode.org/field/JSON'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = builtinMap[fieldType]||fieldType;

		var fieldValue = (value[fieldName]!==undefined)?value[fieldName]:(propertySchema.default===undefined?"":propertySchema.default);
		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;
		var element = input[fieldType] = {};
		for(var n in propertySchema) element[n] = propertySchema[n];
		element.name = baseName+(nodeProperties[fieldName]?nodeProperties[fieldName]:fieldName);
		element.value = fieldValue;
		element.base = propertySchema.id || schemaBase;
		var transformTypes = ['http://magnode.org/view/'+outputType];
		render.render(targetType, input, transformTypes, function(err, res){
			//if(err) return haveRenderedFields(err);
			if(res && res[targetType]){
				renderedFields[fieldName] = res[targetType];
			}else{
				renderedFields[fieldName] = '<pre class="field-default">'+escapeHTML(util.inspect(value[fieldName]))+'</pre>';
				if(outputType=='FormTransform') renderedFields[fieldName] += '<input type="hidden" name="'+escapeHTMLAttr(baseName+fieldName+'.format')+'" value="noop"/>';
			}
			renderFields(properties, fieldList, renderedFields);
		});
	}

	function haveRenderedFields(err, renderedFields, properties){
		if(err) return void callback(err);
		var fieldNames = [];
		var fields = [];
		for(var n in properties){
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+escapeHTML(fieldTitle)+"</dt><dd>"+renderedFields[n]+"</dd>");
			fieldNames.push(n);
		}
		var extras = [];
		for(var n in value){
			if(properties[n]!==undefined) continue;
			if(outputType=='FormTransform'){
				var dt = '<input type="text" name="'+escapeHTMLAttr(baseName+extras.length+'.name')+'" value="'+escapeHTMLAttr(n)+'" class="field-name"/>'
					+ '<input type="hidden" name="'+escapeHTMLAttr(baseName+extras.length+'.format')+'" value="ObjectProperty"/>';
			}else{
				var dt = escapeHTML(n);
			}
			fieldNames.push(extras.length);
			extras.push('<dt>'+dt+'</dt><dd>'+renderedFields[n]+'</dd>');
		}

		var result = '<dl>'+fields.join('')+'</dl>';
		if(extras.length){
			result += '<hr/><dl>'+extras.join('')+'</dl>';
		}
		if(outputType=='FormTransform'){
			result += '<input type="hidden" name="'+baseName+'fields" value="'+escapeHTMLAttr(JSON.stringify(fieldNames))+'"/>'
				+ '<input type="hidden" name="'+baseName+'format" value="Object"/>'
				+ tail.join('');
		}
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
} }

module.exports = generateTransform('object', 'ViewTransform');
module.exports.generateTransform = generateTransform;
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
