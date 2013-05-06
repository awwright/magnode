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
	for(var n in value) if(properties[n]===undefined){ nodeFields.push(n); }
	var olItems = [];
	var dlItems = [];
	var fieldList = [];
	var fieldNames = [];
	var renderedFields = {};

	if(value instanceof Array){
		for(var i=0; i<value.length; i++){
			var schema = inputResource.additionalItems || inputResource.items || {};
			var field = Object.create(schema);
			field.name = baseName+i;
			field.value = value[i];
			olItems.push(baseName+i);
			fieldList.push(field);
			renderedFields[field.name] = i;
		}
		// If there are other non-numeric properties added to this Array they're going to get dropped in the conversion to JSON anyways.
		// So we'll convienently ignore them.
	}else{
		var i = 0;
		for(var propName in value){
			var propertySchema = properties[propName] || inputResource.additionalProperties || {};
			var labelSchema = (propertySchema===inputResource.additionalProperties) && inputResource.additionalPropertiesName;
			if(propertySchema.$ref && resources.jsonschema){
				propertySchema = resources.jsonschema.getSchema(url.resolve(schemaBase, propertySchema.$ref)) || {};
			}
			var field = Object.create(propertySchema);
			field.value = value[propName];
			if(properties[propName]===undefined){
				// this is an additionalProperty
				field.name = baseName+i+'.value';
				fieldList.push(field);
				fieldList.push({widget:'Label', name:baseName+i+'.name', value:propName});
				dlItems.push({dt:baseName+i+'.name', dd:baseName+i+'.value'});
				i++;
			}else{
				// This is a specified property
				field.name = baseName+'prop.'+propName;
				fieldList.push(field);
				fieldNames.push(propName);
				renderedFields[field.name+'.name'] = escapeHTML(propName);
				dlItems.push({dt:field.name+'.name', dd:field.name});
			}
		}
	}
	var arrLen = i;


	renderFields(fieldList);

	function renderFields(fieldList){
		var self=this;
		var field=fieldList.shift();
		if(!field) return void haveRenderedFields(null);

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
		var fieldType = field.widget || formatMap[field.format] || typeMap[field.type];
		// Some builtin JSON formats need to be mapped to URIs
		var builtinMap =
			{ uri: 'http://magnode.org/field/URI'
			, json: 'http://magnode.org/field/JSON'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = builtinMap[fieldType]||fieldType;

		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;
		input[fieldType] = field;
		// FIXME this should be resolved?
		field.base = field.id || schemaBase;
		var transformTypes = ['http://magnode.org/view/'+outputType];
		render.render(targetType, input, transformTypes, function(err, res){
			// if(err) return void haveRenderedFields(err);
			if(res && res[targetType]){
				renderedFields[field.name] = res[targetType];
			}else{
				renderedFields[field.name] = '<pre class="field-default">'+escapeHTML(util.inspect(field.value))+'</pre>';
				if(outputType=='FormTransform') renderedFields[field.name] += '<input type="hidden" name="'+escapeHTMLAttr(field.name+'.format')+'" value="noop"/>';
			}
			renderFields(fieldList);
		});
	}

	function haveRenderedFields(err){
		if(err) return void callback(err);

		var result = '';
		if(olItems.length){
			result += '<ol>'+olItems.map(function(n){ return '<li>'+renderedFields[n]+'</li>'; }).join('')+'</ol>';
		}
		if(dlItems.length){
			result += '<dl>'+dlItems.map(function(n){
				var f = (outputType=='FormTransform'&&n.p)?('<input type="hidden" name="'+escapeHTMLAttr(n.p+'.format')+'" value="ObjectProperty"/>'):'';
				return '<dt>'+renderedFields[n.dt]+'</dt><dd>'+renderedFields[n.dd]+'</dd>'+f;
			}).join('')+'</dl>';
		}
		if(!result){
			result += '<i>empty</i>';
		}
		if(arrLen){
			result += '<input type="hidden" name="'+baseName+'length" value="'+arrLen+'"/>';
		}
		if(outputType=='FormTransform'){
			// For some reason the <http://magnode.org/fieldpost/> items are using UCFirst notation. Like this one should be. Whatever.
			result += '<input type="hidden" name="'+baseName+'fields" value="'+escapeHTMLAttr(JSON.stringify(fieldNames))+'"/>'
				+ '<input type="hidden" name="'+baseName+'format" value="'+(valueType=='array'?'Array':'Object')+'"/>'
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
