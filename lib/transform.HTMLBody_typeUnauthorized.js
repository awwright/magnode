var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/Unauthorized"];
	var body = '<h1>Access Denied</h1>Accessing resource: '+escapeHTML(doc.subject);
	callback(null, {"http://magnode.org/HTMLBody":body});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeUnauthorized";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform', 'view:Core']
	, 'view:domain': {$list:['type:Unauthorized']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
