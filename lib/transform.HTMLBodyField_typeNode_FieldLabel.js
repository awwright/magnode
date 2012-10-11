var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function DHTMLBodyField_typeNode_FieldLabel(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/line'];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<input name="value.'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'" type="text" class="field-label"/>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="FormFieldElementString"/>';
	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldLabel';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/line']}
	, 'view:range': 'type:HTMLBodyField'
	}
