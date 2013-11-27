var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBDocument"];
	var body = '<pre>'+escapeHTML(require('util').inspect(doc))+'</pre>';
	callback(null, {"http://magnode.org/HTMLBody":body});

}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBDocument";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoDBDocument']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	, 'rdfs:seeAlso':
		{ id: 'Transform:ResourceMenu_typeMongoDBDocument'
		, a: ['view:ModuleTransform', 'view:GetTransform', 'view:PutFormTransform', 'view:DeleteFormTransform']
		, 'view:module': "magnode/transform.ResourceMenuAuto_typeNode"
		, 'view:domain': {$list: ['type:MongoDBDocument']}
		, 'view:range': 'type:ResourceMenu'
		, 'view:nice': 1
		}};
