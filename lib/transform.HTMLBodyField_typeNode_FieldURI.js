var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/uri'];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<input name="value.'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'" type="text" class="field-uri"/>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="FormFieldElementString"/>';
	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldURI';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/uri']}
	, 'view:range': 'type:HTMLBodyField'
	}
