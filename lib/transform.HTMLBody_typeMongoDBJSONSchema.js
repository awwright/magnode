/*
Note that this transform is usually, but not necessarially, picked instead of
HTMLBodyListTable_typeMongoCursor when rendering a MongoDBJSONSchema.
*/
var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

module.exports = function HTMLBody_typeMongoDBJSONSchema(db, transform, input, render, callback){
	var node = input['http://magnode.org/MongoDBJSONSchema'];
	var subject = node.subject || input.resource;

	var targetType = 'http://magnode.org/HTMLBody';
	var resources = Object.create(input.requestenv); // FIXME shouldn't this be Object.create(input.requestenv) ?
	// TODO if node.tablequery exists, use that instead of this default
	resources['http://magnode.org/MongoDBList'] = {
		collection: node.collection,
		filter: {},
		sort: [ {field:'_id', dir:1} ],
		output_type: 'table',
		schema: node.schema||node,
		fields: [
			{ label:'_id', text_content_field:'_id' },
			{ label:'subject', text_content_field:'subject', link_href_field:'subject' },
			//{ label:'slug', text_content_field:'slug' },
			{ label:'label', text_content_field:'label', link_href_rel:'self' }
		],
		pager: {limit: 50}
	};
	if(node.tablequery && node.tablequery.fields){
		resources['http://magnode.org/MongoDBList'].fields = node.tablequery.fields.map(function(v){
			if(typeof v=='string'){
				return { label:v, text_content_field:v };
			}else{
				return v;
			}
		});
	}
	// TODO use output_type:"table" and set fields as appropriate from node.schema.properties
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		if(err) return void callback(err);
		var url = escapeHTMLAttr(relativeuri(input.rdf,subject));
		var menu = '<h1>Schema: '+escapeHTML(input.node&&input.node.label||'')+'</h1>';
		menu += '<div><a href="'+url+'?new">Create new instance</a></div>';
		menu += '<dl>';
		menu += '<dt>Label</dt><dd>'+escapeHTML(node.label)+'</dd>';
		menu += '<dt>Description</dt><dd>'+escapeHTML(node.description)+'</dd>';
		menu += '</dl>';
		menu += '<h2>Instances</h2>';
		var output = {'http://magnode.org/HTMLBody':menu+resources[targetType]};
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBJSONSchema";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': 'type:HTMLBody'
	, 'view$nice': -1
	};
