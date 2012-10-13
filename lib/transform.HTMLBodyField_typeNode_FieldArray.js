var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/array'];

	var name = inputResource.name;
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;

	// TODO This needs to support more than just a single type of field
	var items = [];
	for(var i=0; i<value.length; i++){
		items.push('<li><input name="'+escapeHTMLAttr(name+'.'+i+'.value')+'" value="'+escapeHTMLAttr(value[i])+'" type="text" class="field-uri"/></li>');
	}
	items.push('<li><input name="'+escapeHTMLAttr(name+'.new.value')+'" value="" type="text" class="field-uri"/></li>');
	var out = '<ol class="field-array">'+items.join('')+'</ol>';
	// For the sake of page scripts this must be the first XML node right after the <ol>
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.length" value="'+value.length+'"/>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.format" value="FormFieldElementArray"/>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.itemformat" value="FormFieldElementString"/>';

	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldArray';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/array']}
	, 'view:range': 'type:HTMLBodyField'
	}
