var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldToken(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/token'];

	var name = inputResource.name;

	var out = '<code>'+escapeHTML(inputResource.tokenPattern)+'</code>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+':format" value="Token"/>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.pattern" value="'+escapeHTMLAttr(inputResource.tokenPattern)+'"/>';
	var ret = {};
	outputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldToken';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/token']}
	, 'view:range': 'type:HTMLBodyField'
	}
