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
	var fieldSet = {};
	var fieldNames = [];
	var renderedFields = {};

	if(value instanceof Array){
		var olItems = [];
		for(var i=0; i<value.length; i++){
			var schema = inputResource.additionalItems || inputResource.items || {};
			var field = Object.create(schema);
			field.name = baseName+i;
			field.value = value[i];
			olItems.push(baseName+i);
			fieldSet[field.name] = field;
			renderedFields[field.name] = i;
		}
		var additionalItems = inputResource.additionalItems!==undefined&&inputResource.additionalItems || inputResource.items!==undefined&&inputResource.items || {};
		if(outputType=='FormTransform' && additionalItems){
			// And if acceptable, create a blank instance
			var newfield = Object.create(additionalItems);
			newfield.name = baseName+'new';
			newfield.value = schema.default;
			fieldSet[newfield.name] = newfield;
		}
		// If there are other non-numeric properties added to this Array they're going to get dropped in the conversion to JSON anyways.
		// So we'll convienently ignore them.
	}else{
		var dlItems = [];
		var i = 0;
		for(var propName in properties){
			// This is a specified property
			var propertySchema = properties[propName];
			var field = Object.create(propertySchema);
			field.name = baseName+'prop.'+propName;
			field.value = value && value[propName];
			fieldSet[field.name] = field;
			fieldNames.push(propName);
			renderedFields[field.name+'.name'] = escapeHTML(propName);
			dlItems.push({dt:field.name+'.name', dd:field.name});
		}
		for(var propName in value){
			if(properties[propName]!==undefined) continue;
			var propertySchema = properties[propName] || inputResource.additionalProperties || {};
			var labelSchema = (propertySchema===inputResource.additionalProperties) && inputResource.additionalPropertiesName;
			if(propertySchema.$ref && resources.jsonschema){
				var schemaId = url.resolve(schemaBase, propertySchema.$ref);
				propertySchema = resources.jsonschema.getSchema(schemaId) || {};
			}else{
				var schemaId = propertySchema.id || schemaBase;
			}
			// this is an additionalProperty
			var field = Object.create(propertySchema);
			field.name = baseName+i+'.value';
			field.value = value && value[propName];
			fieldSet[field.name] = field;
			var fieldName = Object.create(inputResource.additionalPropertiesName || {widget:'http://magnode.org/field/Label'});
			fieldName.name = baseName+i+'.name';
			fieldName.value = propName;
			fieldSet[fieldName.name] = fieldName;
			dlItems.push({p:baseName+i, dt:baseName+i+'.name', dd:baseName+i+'.value'});
			i++;
		}
		if(outputType=='FormTransform' && inputResource.additionalProperties!==false){
			var newfieldName = Object.create(inputResource.additionalPropertiesName || {widget:'http://magnode.org/field/Label'});
			newfieldName.name = baseName+'new.name';
			newfieldName.value = '';
			fieldSet[newfieldName.name] = newfieldName;

			var schema = inputResource.additionalProperties || {};
			var newfield = Object.create(schema);
			newfield.name = baseName+'new.value';
			newfield.value = schema.default;
			fieldSet[newfield.name] = newfield;
		}
	}
	var arrLen = i;


	renderFields(Object.keys(fieldSet).map(function(n){return fieldSet[n];}));

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
			,  "boolean": 'http://magnode.org/field/Number'
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
		if(olItems){
			result += '<ol class="field-array">';
			result += olItems.map(function(n){ return '<li>'+renderedFields[n]+'</li>'; }).join('');
			if(outputType=='FormTransform') result += '<li>'+renderedFields[baseName+'new']+'</li>';
			result += '</ol>';
		}
		if(dlItems){
			result += '<dl'+(renderedFields[baseName+'new.name']?' class="field-object"':'')+'>';
			result += dlItems.map(function(n){
				var f = (outputType=='FormTransform'&&n.p)?('<input type="hidden" name="'+escapeHTMLAttr(n.p+'.format')+'" value="ObjectProperty"/>'):'';
				return '<dt>'+renderedFields[n.dt]+f+'</dt><dd>'+renderedFields[n.dd]+'</dd>';
			}).join('');
			if(renderedFields[baseName+'new.name']){
				result += '<dt>'+renderedFields[baseName+'new.name']+'<input type="hidden" name="'+escapeHTMLAttr(baseName+'new.format')+'" value="ObjectProperty"/></dt><dd>'+renderedFields[baseName+'new.value']+'</dd>';
			}
			result += '</dl>';
		}
		if(!result){
			result += '<i>empty</i>';
		}
		if(typeof arrLen=='number'){
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
