var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBCollection"];
	var body = '<h1>MongoDB Collection <i>'+escapeHTML(doc.collection)+'</i></h1>';
	body += '<p>Accessing resource: '+escapeHTML(doc.collection)+'</p>';
	body += '<p><a href="schema">Create View/Schema</a></p>';

	doc.db.collection(doc.collection).indexes(function(err, indexes){
		if(!indexes){
			body += '<h2>Error</h2><pre>'+util.inspect(err)+'</pre>';
			return void callback(null, {"http://magnode.org/HTMLBody":body});
		}
		body += '<h2>Indexes</h2><table><thead><tr><th>Index Name</th><th>Data</th></tr></thead><tbody>';
		for(var i=0; i<indexes.length; i++){
			body += '<tr><td><pre>'+escapeHTML(indexes[i].name)+'</pre></td><td><pre>'+escapeHTML(util.inspect(indexes[i]))+'</pre></td></tr>'
		}
		body += '</tbody></table>';

		function formatId(name, type, value, rdf){
			return 'ObjectId(<code><a href="ObjectId/'+escapeHTML(value)+'">'+escapeHTML(value)+'</a></code>)';
		}

		// Render the table of documents
		var query =
			{ name:'documents'
			, query:
				{ fields: [{name:'_id',type:'ObjectId',f:formatId}]
				, filter: {}
				, collection: doc.collection
				}
			, type:
				[ 'http://magnode.org/MongoDB_List'
				, 'http://magnode.org/MongoDB_ListTable'
				]
			};

		var targetType = 'http://magnode.org/HTMLBodyTable';
		var resources = Object.create(input.requestenv);
		resources['http://magnode.org/MongoDB_List'] = query;
		resources['http://magnode.org/MongoDB_ListTable'] = query;
		transformTypes = [];
		render.render(targetType, resources, transformTypes, haveRenderedForm);
		function haveRenderedForm(err, resources){
			if(err) return void callback(err);
			body += '<h2>Documents</h2>';
			body += resources[targetType];
			callback(null, {"http://magnode.org/HTMLBody":body});
		}
	});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBCollection";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoDBCollection']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
