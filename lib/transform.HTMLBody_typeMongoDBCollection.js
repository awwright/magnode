var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBCollection"];
	var body = '<h1>MongoDB Collection <i>'+escapeHTML(doc.collection)+'</i></h1><p>Accessing resource: '+escapeHTML(doc.collection)+'</p>';

	doc.db.collection(doc.collection).indexes(function(err, indexes){
		if(indexes){
			body += '<h2>Indexes</h2><table><thead><tr><th>Index Name</th><th>Data</th></tr></thead><tbody>';
			for(var i=0; i<indexes.length; i++){
				body += '<tr><td><pre>'+escapeHTML(indexes[i].name)+'</pre></td><td><pre>'+escapeHTML(util.inspect(indexes[i]))+'</pre></td></tr>'
			}
			body += '</tbody></table>';
		}else{
			body += '<h2>Error</h2><pre>'+util.inspect(err)+'</pre>';
		}
		callback(null, {"http://magnode.org/HTMLBody":body});
	});

}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBCollection";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoDBCollection']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
