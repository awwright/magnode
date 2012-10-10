var util=require('util');
var url=require('url');
var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var inputTypes = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input[inputTypes[0]];

	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;
	var properties = inputResource.properties;

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
		var fieldType = properties[fieldName].format;
		var fieldValue = (node[fieldName]!==undefined)?node[fieldName]:(properties[fieldName].default===undefined?"":properties[fieldName].default);
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/uri'
			, json: 'http://magnode.org/field/json'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = typeMap[fieldType]||fieldType;
		var input = {};
		input[fieldType] = {};
		for(var n in properties[fieldName]) input[fieldType][n] = properties[fieldName][n];
		input[fieldType].name = fieldName;
		input[fieldType].value = fieldValue;
		var transformTypes = [];
		render.render(targetType, input, transformTypes, function(err, res){
			if(err) return cb(err);
			if(res && res[targetType]){
				renderedFields[fieldName] = res[targetType];
			}else{
				renderedFields[fieldName] = '<pre class="field-default">'+escapeHTML(util.inspect(node[fieldName]))+'</pre><input type="hidden" name="'+escapeHTMLAttr(baseName+'format.'+fieldName)+'" value="noop"/>';
			}
			renderFields(properties, node, fieldList, renderedFields, cb);
		});
	}

	function haveRenderedFields(err, renderedFields, properties){
		var fieldNames = [];
		for(var n in properties){
			switch(properties[n].format){
				case 'hidden': tail.push('<input type="hidden" name="'+escapeHTMLAttr(baseName+'format.'+n)+'" value="noop"/>'+escapeHTML(baseName+'format.'+n)+'; ');
					continue;
			}
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+escapeHTML(fieldTitle)+"</dt><dd>"+renderedFields[n]+"</dd>");
			fieldNames.push(n);
		}

		for(var n in node){
			if(properties[n]) continue;
			fields.push('<dt>'+escapeHTML(n)+'</dt><dd><textarea name="'+escapeHTMLAttr(baseName+'value.'+name)+'">'+escapeHTML(JSON.stringify(value,null,"\t"))+'</textarea><input type="hidden" name="'+escapeHTMLAttr(baseName+'format.'+name)+'" value="json"/></dd>');
			fieldNames.push(n);
		}

		var result =
			"<dl>"+fields.join("")+"</dl>"
			+ '<input type="hidden" name="'+baseName+'fields" value="'+escapeHTMLAttr(JSON.stringify(fieldNames))+'"/>'
			+ '<input type="submit" value="Submit"/>'
			+ tail.join('');
		var output = {};
		for(var j=0;j<outputTypes.length;j++){
			output[outputTypes[j]] = result;
		}
		callback(output);
	}
}
module.exports.URI = 'Transform:HTMLBodyField_typeNode_FieldObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/object']}
	, 'view:range': 'type:HTMLBodyField'
	}
