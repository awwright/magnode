var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var ObjectId = require('mongodb').ObjectID;

// This doesn't mean anything, we just need a name->name map that doesn't include certain characters in the output
// Use * because it's not URL-encoded, saves two characters in transmission
function obfuscateName(n){
	return n.replace(/\*/g, '*2A').replace(/\./g, '*2E').replace(/\:/g, '*3A');
}

function generateTransform(valueType, outputType){
var editable = (outputType=='PutFormTransform');
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
	// Maybe we should figure out how to preserve the original value, even if it won't validate against the schema later
	// But it wouldn't ultimately matter, if we're saving against a schema, then
	// the schema should coerce the values to the expected types
	if(inputResource.type==='array' && !(value instanceof Array) && value!==undefined) value = [value];
	if(value instanceof Array){
		var olItems = [];
		var schema = inputResource.additionalItems || inputResource.items || {};
		for(var i=0; i<value.length; i++){
			var field = Object.create(schema);
			field.name = baseName+i;
			field.value = value[i];
			olItems.push(baseName+i);
			fieldSet[field.name] = field;
			renderedFields[field.name] = i;
		}
		var additionalItems = inputResource.additionalItems!==undefined&&inputResource.additionalItems || inputResource.items!==undefined&&inputResource.items || {};
		if(editable && additionalItems){
			// And if acceptable, create a blank instance
			var newfield = Object.create(additionalItems);
			newfield.name = baseName+':new';
			newfield.value = schema.default;
			fieldSet[newfield.name] = newfield;
		}
		// If there are other non-numeric properties added to this Array they're going to get dropped in the conversion to JSON anyways.
		// So we'll conveniently ignore them.
	}else{
		var dlItems = [];
		var i = 0;
		// Run through properties listed in the schema
		for(var propName in properties){
			var propertySchema = properties[propName];
			if(propertySchema.$ref && resources.jsonschema){
				var schemaId = url.resolve(schemaBase, propertySchema.$ref);
				propertySchema = resources.jsonschema.getSchema(schemaId) || {status:404};
			}else{
				var schemaId = propertySchema.id || schemaBase;
			}
			var field = Object.create(propertySchema);
			field.name = baseName+obfuscateName(propName);
			field.value = value && value[propName];
			// Use the default value if this is a new resource (in which we've only been provided a skeleton instance)
			// Or if the value would otherwise violate the schema
			if(field.value===undefined && (inputResource.required===true||resources.createNew)) field.value=propertySchema.default;
			fieldSet[field.name] = field;
			fieldNames.push(obfuscateName(propName));
			renderedFields[field.name+':name'] = escapeHTML(propName);
			if(propertySchema.required===true){
				renderedFields[field.name+':name'] += ' <small>[Required]</small>';
			}
			if(propertySchema.description) renderedFields[field.name+':name'] += ' <small>'+escapeHTML(propertySchema.description)+'</small>';
			dlItems.push({dt:field.name+':name', dd:field.name});
		}
		// Run through other additionalProperties
		for(var propName in value){
			if(properties[propName]!==undefined) continue;
			// FIXME add support for patternProperties
			var propertySchema = inputResource.additionalProperties || {};
			var labelSchema = (propertySchema===inputResource.additionalProperties) && inputResource.additionalPropertiesName;
			if(propertySchema.$ref && resources.jsonschema){
				var schemaId = url.resolve(schemaBase, propertySchema.$ref);
				propertySchema = resources.jsonschema.getSchema(schemaId) || {status:404};
			}else{
				var schemaId = propertySchema.id || schemaBase;
			}
			// this is an additionalProperty
			var field = Object.create(propertySchema);
			field.name = baseName+i;
			field.value = value && value[propName];
			fieldSet[field.name] = field;
			var fieldName = Object.create(inputResource.additionalPropertiesName || {widget:'http://magnode.org/field/Label'});
			fieldName.name = baseName+i+':name';
			fieldName.value = propName;
			fieldSet[fieldName.name] = fieldName;
			dlItems.push({p:baseName+i, dt:baseName+i+':name', dd:baseName+i});
			i++;
		}
		if(editable && inputResource.additionalProperties!==false){
			var newfieldName = Object.create(inputResource.additionalPropertiesName || {widget:'http://magnode.org/field/Label'});
			newfieldName.name = baseName+':new:name';
			newfieldName.value = '';
			fieldSet[newfieldName.name] = newfieldName;

			var schema = inputResource.additionalProperties || {};
			var newfield = Object.create(schema);
			newfield.name = baseName+':new';
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
			,  "boolean": 'http://magnode.org/field/Checkbox'
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
		fieldType = builtinMap[fieldType] || fieldType || 'http://magnode.org/field/JSON';

		// Prototype because the input shouldn't include any resource-related objects
		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;
		input.jsonschema = resources.jsonschema;
		input[fieldType] = field;
		// FIXME this should be resolved?
		field.base = field.id || schemaBase;
		var transformTypes = ['http://magnode.org/view/'+outputType];
		render.render(targetType, input, transformTypes, function(err, res){
			// if(err) return void haveRenderedFields(err);
			if(res && res[targetType]){
				renderedFields[field.name] = res[targetType];
			}else{
				renderedFields[field.name] = '<div class="field-default">'
					+'<p><i>Unknown widget/format:</i></p>'
					+'<pre>'+escapeHTML(util.inspect(field))+'</pre>'
					+'<pre>'+escapeHTML(util.inspect(Object.getPrototypeOf(field)))+'</pre>'
					+'</div>' ;

				if(editable) renderedFields[field.name] += '<input type="hidden" name="'+escapeHTMLAttr(field.name+':format')+'" value="noop"/>';
			}
			//renderedFields[field.name] =
			//		'<pre class="field-default">'+escapeHTML(util.inspect(field))+'</pre>'
			//		+ '<pre class="field-default">'+escapeHTML(util.inspect(Object.getPrototypeOf(field)))+'</pre>'
			//		+ renderedFields[field.name];
			renderFields(fieldList);
		});
	}

	function haveRenderedFields(err){
		if(err) return void callback(err);

		var result = '';
		if(olItems){
			var classNames = ['field-array'];
			if(editable) classNames.push('field-array-new');
			result += '<ol class="'+classNames.join(' ')+'">';
			result += olItems.map(function(n){ return '<li>'+renderedFields[n]+'</li>'; }).join('');
			if(editable) result += '<li>'+renderedFields[baseName+':new']+'</li>';
			result += '</ol>';
		}
		if(dlItems){
			var classNames = ['field-object'];
			if(renderedFields[baseName+':new:name']) classNames.push('field-object-new');
			result += '<dl class="'+escapeHTMLAttr(classNames.join(' '))+'">';
			result += dlItems.map(function(n){
				return '<dt>'+renderedFields[n.dt]+'</dt><dd>'+renderedFields[n.dd]+'</dd>';
			}).join('');
			if(renderedFields[baseName+':new:name']){
				result += '<dt>'+renderedFields[baseName+':new:name']+'</dt><dd>'+renderedFields[baseName+':new']+'</dd>';
			}
			result += '</dl>';
		}
		if(!result){
			result += '<i>empty</i>';
		}
		if(typeof arrLen=='number'){
			result += '<input type="hidden" name="'+baseName+':length" value="'+arrLen+'"/>';
		}
		if(editable){
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

module.exports = generateTransform('object', 'GetTransform');
module.exports.generateTransform = generateTransform;
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject';
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
