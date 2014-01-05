var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBDocument"];
	var body = '<h1>ObjectId(<code>'+doc.document._id.toString()+'</code>) in <i>'+doc.collectionName+'</i></h1>';
	body += '<pre>'+escapeHTML(JSON.stringify(doc.document,null,"\t"))+'</pre>';
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
