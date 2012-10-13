var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldToken(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/token'];

	var name = inputResource.name;
	var value = inputResource.value.toString();

	var out = '<code>:<i>ID</i></code>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.format" value="FormFieldElementToken"/>';
	var ret = {};
	outputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldToken';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/token']}
	, 'view:range': 'type:HTMLBodyField'
	}
