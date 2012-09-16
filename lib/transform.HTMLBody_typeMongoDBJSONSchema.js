/*
Transform:HTMLBody_typeMongoDBJSONSchema
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.HTMLBody_typeMongoDBJSONSchema" ;
	view:domain type:MongoDBJSONSchema ;
	view:range type:HTMLBody .
*/
/*
Note that this transform is usually, but not necessarially, picked instead of
HTMLBodyListTable_typeMongoCursor when rendering a MongoDBJSONSchema.
*/
var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeuri=require('./relativeuri');

module.exports = function HTMLBody_typeMongoDBJSONSchema(db, transform, input, render, callback){
	console.log('Rendering table...');
	var node = input.node;
	var subject = node.subject;

	var targetType = 'http://magnode.org/HTMLBodyTable';
	var resources = {};
	for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		var menu = '<ul>';
		var url = escapeHTMLAttr(relativeuri(input.rdf,subject));
		menu += '<li><a href="'+url+'">List</a></li>';
		menu += '<li><a href="'+url+'?new&edit">New</a></li>';
		menu += '<li><a href="'+url+'?edit">Edit</a></li>';
		menu += '</ul>';
		callback(null, {'http://magnode.org/HTMLBody':menu+resources[targetType]});
	}
}
