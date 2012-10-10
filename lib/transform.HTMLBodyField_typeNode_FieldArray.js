var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var inputType = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});

	var inputResource = input[inputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;

	// TODO This needs to support more than just a single type of field
	var items = [];
	for(var i=0; i<value.length; i++){
		items.push('<li><input name="value.'+escapeHTMLAttr(name+'.'+i)+'" value="'+escapeHTMLAttr(value[i])+'" type="text" class="field-uri"/></li>');
	}
	items.push('<li><input name="value.'+escapeHTMLAttr(name+'.new')+'" value="" type="text" class="field-uri"/></li>');
	var out = '<ol class="field-array">'+items.join('')+'</ol><input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="array"/><input type="hidden" name="length.'+escapeHTMLAttr(name)+'" value="'+value.length+'"/>';
	var ret = {};
	outputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'Transform:HTMLBodyField_typeNode_FieldArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/array']}
	, 'view:range': 'type:HTMLBodyField'
	}
