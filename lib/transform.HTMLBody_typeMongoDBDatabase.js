var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBDatabase"];
	var body = '<h1>MongoDB Database</h1>';

	doc.db.collections(function(err, collections){
		// FIXME make sure this works and we're pulling out the collection name
		if(err){
			body += err.stack || err.toString();
			return void callback(null, {"http://magnode.org/HTMLBody":body});
		}
		body += '<h2>Collections</h2><ul>';
		collections.map(function(v){
			return v.name.substring(v.name.indexOf('.')+1);
		}).forEach(function(v){
			body += '<li><a href="collection/'+escapeHTMLAttr(encodeURI(v))+'/">'+escapeHTML(v)+'</a></li>'
		});
		body += '</ul>';
		callback(null, {"http://magnode.org/HTMLBody":body});
	});

}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBDatabase";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:Core']
	, 'view:domain': {$list:['type:MongoDBDatabase']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
