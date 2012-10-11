var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldDate(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/date'];

	var name = inputResource.name;
	var value = inputResource.value.toString();

	var out = '<input name="value.'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'" type="text" class="field-date"/>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="FormFieldElementDate"/>';
	var ret = {};
	outputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldDate';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/date']}
	, 'view:range': 'type:HTMLBodyField'
	}
