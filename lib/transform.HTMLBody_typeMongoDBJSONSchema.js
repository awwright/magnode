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
	var resources = Object.create(input);
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		if(err) return void callback(err);
		var url = escapeHTMLAttr(relativeuri(input.rdf,subject));
		var menu = '<h1>'+escapeHTML(input.node&&input.node.label||'')+'</h1>';
		menu += '<div><a href="'+url+'?new">Create new instance</a></div>';
		var output = {'http://magnode.org/HTMLBody':menu+resources[targetType]};
		output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
		output['http://magnode.org/ResourceMenu'].push({title:'New',href:'?new'});
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBJSONSchema";
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': 'type:HTMLBody'
	}
