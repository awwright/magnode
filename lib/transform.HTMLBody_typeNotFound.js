var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/NotFound"];
	var body = '<h1>Not Found</h1><p>Accessing resource: '+escapeHTML(doc.subject)+'</p>';
	callback(null, {"http://magnode.org/HTMLBody":body});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeNotFound";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform']
	, 'view:domain': {$list:['type:NotFound']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
