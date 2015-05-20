var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

module.exports = function HTMLBody_typeTerm(db, transform, input, render, callback){
	var node = input['http://magnode.org/Term'];
	var subject = node.subject;

	var targetType = 'http://magnode.org/HTMLBody';
	var resources = Object.create(input.requestenv);
	var doc = {
		label: node.label,
		collection: 'nodes',
		output_type: 'table',
		filter: {type:subject},
		order: [],
		fields: [
			{ label:'_id', text_content_field:'_id' },
			{ label:'Label', text_content_field:'label', link_href_rel:'self' },
			{ label:'Description', text_content_field:'description' },
			{ label:'URI', text_content_field:'subject', link_href_field:'subject' },
		],
		pager: {limit: 50},
	};
	resources['http://magnode.org/MongoDBList'] = doc;
	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		if(err) return void callback(err);
		var url = escapeHTMLAttr(relativeuri(input.rdf, input.request.uri, subject));
		var header = '<h1>Term: '+escapeHTML(node&&node.label||'')+'</h1>';
		if(node&&node.description) header += '<p>'+escapeHTML(node.description)+'</p>';
		var output = {'http://magnode.org/HTMLBody': header+resources[targetType] };
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeTerm";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:Core']
	, 'view:domain': {$list:['type:Term']}
	, 'view:range': 'type:HTMLBody'
	, 'view$nice': -1
	};
