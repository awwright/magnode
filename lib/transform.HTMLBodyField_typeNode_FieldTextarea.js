var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var inputTypes = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input[inputTypes[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<textarea name="value.'+escapeHTMLAttr(name)+'" class="field-textarea">'+escapeHTML(value)+'</textarea><input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="string"/>';
	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'Transform:HTMLBodyField_typeNode_FieldTextarea';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/textarea']}
	, 'view:range': 'type:HTMLBodyField'
	}
