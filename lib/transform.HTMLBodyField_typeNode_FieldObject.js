var util=require('util');
var url=require('url');
var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var ObjectId = require('mongolian').ObjectId;
var relativeuri = require('./relativeuri');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = resources['http://magnode.org/field/object'];

	// If you have field names that include a period, you're gonna have a bad time
	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var properties = inputResource.properties||{};

	var nodeFields = Object.keys(properties);
	renderFields(properties, nodeFields, {});

	function renderFields(properties, fieldList, renderedFields){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return haveRenderedFields(null, renderedFields, properties);
		var targetType = 'http://magnode.org/HTMLBodyField';
		var fieldType = properties[fieldName].widget||properties[fieldName].format;
		var fieldValue = (value[fieldName]!==undefined)?value[fieldName]:(properties[fieldName].default===undefined?"":properties[fieldName].default);
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/URI'
			, json: 'http://magnode.org/field/JSON'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = typeMap[fieldType]||fieldType;
		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;
		input[fieldType] = {};
		for(var n in properties[fieldName]) input[fieldType][n] = properties[fieldName][n];
		input[fieldType].name = fieldName;
		input[fieldType].value = fieldValue;
		var transformTypes = ['http://magnode.org/view/ViewTransform'];
		render.render(targetType, input, transformTypes, function(err, res){
			//if(err) return haveRenderedFields(err);
			if(res && res[targetType]){
				renderedFields[fieldName] = res[targetType];
			}else{
				renderedFields[fieldName] = '<pre class="field-default">'+escapeHTML(util.inspect(value[fieldName]))+'</pre>';
			}
			renderFields(properties, fieldList, renderedFields);
		});
	}

	function haveRenderedFields(err, renderedFields, properties){
		if(err) return callback(err);
		var fieldNames = [];
		var fields = [];
		for(var n in properties){
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+escapeHTML(fieldTitle)+"</dt><dd>"+renderedFields[n]+"</dd>");
			fieldNames.push(n);
		}

		function JSONReplacer(key, value){
			if(value instanceof ObjectId) return {$ObjectId:value.toString()};
			if(value instanceof Date) return {$Date:date.valueOf()};
			return value;
		}

		for(var n in value){
			if(properties[n]) continue;
			fields.push('<dt>'+escapeHTML(n)+'</dt><dd><pre class="field-json">'+escapeHTML(JSON.stringify(value[n],JSONReplacer,"\t"))+'</pre></dd>');
			fieldNames.push(n);
		}

		var title = escapeHTML(value.label || value.subject || value._id || 'undefined');
		if(value.subject) title = '<a href="'+escapeHTMLAttr(relativeuri(resources.rdf, value.subject))+'">'+title+'</a>';
		var result = '<h2>'+title+'</h2><dl>'+fields.join('')+'</dl>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
