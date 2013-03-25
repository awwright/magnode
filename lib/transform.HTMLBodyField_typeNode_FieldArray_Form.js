var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/array'];

	var name = inputResource.name;
	var values = (inputResource.value instanceof Array)?inputResource.value:[];
	var fieldType = inputResource.items && inputResource.items.format;

	var items = [];
	parseFields(0);

	function parseFields(i){
		var fieldValue;
		if(i==values.length) i='new';
		else fieldValue=values[i];
		var targetType = 'http://magnode.org/HTMLBodyField';
		if(fieldValue===undefined) fieldValue = (inputResource.items.default===undefined)?"":inputResource.items.default;
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/URI'
			, json: 'http://magnode.org/field/JSON'
			, array: 'http://magnode.org/field/array'
			};
		fieldType = typeMap[fieldType]||fieldType;
		var input = {};
		input[fieldType] = {};
		for(var n in inputResource.items) input[fieldType][n] = inputResource.items[n];
		input[fieldType].name = name+'.'+i;
		input[fieldType].value = fieldValue;
		var transformTypes = ['http://magnode.org/view/FormTransform'];
		render.render(targetType, input, transformTypes, function(err, res){
			if(err) return void callback(err);
			if(res && res[targetType]){
				items.push('<li>'+res[targetType]+'</li>');
			}else{
				items.push('<li><pre class="field-default">'+escapeHTML(util.inspect(fieldValue))+'</pre><input type="hidden" name="'+escapeHTMLAttr(name+'.'+i+'.format')+'" value="noop"/></li>');
			}
			if(typeof i=='number') parseFields(i+1);
			else haveRenderedFields();
		});

	}

	function haveRenderedFields(){
		var out = '<ol class="field-array">'+items.join('')+'</ol>';
		// For the sake of page scripts this must be the first XML node right after the <ol>
		out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.length" value="'+(items.length-1)+'"/>';
		out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.format" value="Array"/>';

		var ret = {};
		outputTypes.forEach(function(v){ret[v]=out;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldArray_Form';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/array']}
	, 'view:range': 'type:HTMLBodyField'
	}
