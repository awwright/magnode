var url=require('url');

var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldArray(db, transform, resources, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = resources['http://magnode.org/field/array'];

	var name = inputResource.name;
	var values = (inputResource.value instanceof Array)?inputResource.value:[];
	var schemaBase = inputResource.base;

	var fieldSchema = inputResource.items || {};
	if(fieldSchema.$ref && resources.jsonschema){
		fieldSchema = resources.jsonschema.getSchema(url.resolve(schemaBase, fieldSchema.$ref));
	}

	var items = [];
	parseFields(0);

	function parseFields(i){
		var fieldValue = values[i];

		if(fieldValue===undefined) return void haveRenderedFields();
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
			,  "number": 'http://magnode.org/field/Label'
			,  "integer": 'http://magnode.org/field/Label'
			,  "date": 'http://magnode.org/field/Date'
			};
		var fieldType = fieldSchema.widget || formatMap[fieldSchema.format] || typeMap[fieldSchema.type];
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/URI'
			, json: 'http://magnode.org/field/JSON'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = typeMap[fieldType]||fieldType;

		var input = Object.create(resources.requestenv);
		var element = input[fieldType] = {};
		for(var n in fieldSchema) element[n] = fieldSchema[n];
		element.name = name+'.'+i;
		element.value = fieldValue;
		element.base = fieldSchema.id || inputResource.id || schemaBase;
		var transformTypes = ['http://magnode.org/view/ViewTransform'];
		render.render(targetType, input, transformTypes, function(err, res){
			if(err) return void callback(err);
			if(res && res[targetType]){
				items.push('<li>'+res[targetType]+'</li>');
			}else{
				items.push('<li><pre class="field-default">'+escapeHTML(util.inspect(fieldValue))+'</pre></li>');
			}
			parseFields(i+1);
		});

	}

	function haveRenderedFields(){
		var out = '<ol class="view-array">'+items.join('')+'</ol>';
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=out;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldArray';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['http://magnode.org/field/array']}
	, 'view:range': 'type:HTMLBodyField'
	}
