/*
Note that this transform is usually, but not necessarially, picked instead of
HTMLBodyListTable_typeMongoCursor when rendering a MongoDBJSONSchema.
*/
var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

module.exports = function HTMLBody_typeMongoDBJSONSchema(db, transform, input, render, callback){
	var node = input.node;
	var subject = node.subject;

	var targetType = 'http://magnode.org/HTMLBodyTable';
	var resources = {};
	for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		if(err) return callback(err);
		var menu = '<h1>'+escapeHTML(input.node&&input.node.label||'')+'</h1><div class="pagination"><ul>';
		var url = escapeHTMLAttr(relativeuri(input.rdf,subject));
		menu += '<li class="current"><a href="'+url+'">List</a></li>';
		menu += '<li><a href="'+url+'?new">New</a></li>';
		menu += '<li><a href="'+url+'?edit">Edit</a></li>';
		menu += '</ul></div>';
		callback(null, {'http://magnode.org/HTMLBody':menu+resources[targetType]});
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBJSONSchema";
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': 'type:HTMLBody'
	}
