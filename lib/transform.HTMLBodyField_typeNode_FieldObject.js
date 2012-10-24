var util=require('util');
var url=require('url');
var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// TODO eventually we'll want to clean up how we define fields
// A single file should define the functions that format the HTML elements,
// as well as how to parse the submitted form back into an object.
// These would be exported as transforms to the render, as appropriate.

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/object'];

	// If you have field names that include a period, you're gonna have a bad time
	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var properties = inputResource.properties||{};

	var fields = [];
	var tail = [];
	var node = input.node;

	var nodeFields = Object.keys(properties);

	renderFields(properties, value, nodeFields, {}, haveRenderedFields);

	function renderFields(properties, node, fieldList, renderedFields, cb){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return cb(null, renderedFields, properties);
		var targetType = 'http://magnode.org/HTMLBodyField';
		var fieldType = properties[fieldName].widget||properties[fieldName].format;
		var fieldValue = (node[fieldName]!==undefined)?node[fieldName]:(properties[fieldName].default===undefined?"":properties[fieldName].default);
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/uri'
			, json: 'http://magnode.org/field/json'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = typeMap[fieldType]||fieldType;
		var resources = {};
		for(var n in input) if(input[n]!==inputResource) resources[n]=input[n];
		resources[fieldType] = {};
		for(var n in properties[fieldName]) resources[fieldType][n] = properties[fieldName][n];
		resources[fieldType].name = fieldName;
		resources[fieldType].value = fieldValue;
		var transformTypes = [];
		render.render(targetType, resources, transformTypes, function(err, res){
			//if(err) return cb(err);
			if(res && res[targetType]){
				renderedFields[fieldName] = res[targetType];
			}else{
				renderedFields[fieldName] = '<pre class="field-default">'+escapeHTML(util.inspect(node[fieldName]))+'</pre><input type="hidden" name="'+escapeHTMLAttr(baseName+fieldName+'.format')+'" value="noop"/>';
			}
			renderFields(properties, node, fieldList, renderedFields, cb);
		});
	}

	function haveRenderedFields(err, renderedFields, properties){
		if(err) return callback(err);
		var fieldNames = [];
		for(var n in properties){
			switch(properties[n].format){
				case 'hidden': tail.push('<input type="hidden" name="'+escapeHTMLAttr(baseName+n+'.format')+'" value="noop"/>'+escapeHTML(baseName+n+'.format')+'; ');
					continue;
			}
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+escapeHTML(fieldTitle)+"</dt><dd>"+renderedFields[n]+"</dd>");
			fieldNames.push(n);
		}

		for(var n in node){
			if(properties[n]) continue;
			fields.push('<dt>'+escapeHTML(n)+'</dt><dd><textarea name="'+escapeHTMLAttr(baseName+n+'.value')+'" class="field-json">'+escapeHTML(JSON.stringify(node[n],null,"\t"))+'</textarea><input type="hidden" name="'+escapeHTMLAttr(baseName+n+'.format')+'" value="FormFieldElementJSON"/></dd>');
			fieldNames.push(n);
		}

		var result =
			"<dl>"+fields.join("")+"</dl>"
			+ '<input type="hidden" name="'+baseName+'fields" value="'+escapeHTMLAttr(JSON.stringify(fieldNames))+'"/>'
			+ '<input type="hidden" name="'+baseName+'format" value="FormFieldElementObject"/>'
			+ '<input type="submit" value="Submit"/>'
			+ tail.join('');
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
