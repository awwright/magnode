/*
Note that this transform is usually, but not necessarily, picked instead of
HTMLBodyListTable_typeMongoCursor when rendering a MongoDBJSONSchema.
*/
var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

var rdfFirst = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first';
var rdfRest = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest';
var rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

module.exports = function HTMLBody_typeMongoDBJSONSchema(db, transform, input, render, callback){
	var node = input['http://magnode.org/MongoDBJSONSchema'];
	var subject = node.subject || input.resource;
	var rdf = input.rdf;

	var targetType = 'http://magnode.org/HTMLBody';
	var resources = Object.create(input.requestenv);
	// TODO if node.tablequery exists, use that instead of this default
	resources['http://magnode.org/MongoDBList'] = {
		collection: node.collection,
		filter: {},
		sort: [ {field:'_id', dir:1} ],
		output_type: 'table',
		schema: node.schema||node,
		fields: [
			{ label:'_id', text_content_field:'_id' },
			//{ label:'slug', text_content_field:'slug' },
			{ label:'Label', text_content_field:'label', link_href_rel:'self' },
			{ label:'Description', text_content_field:'description' },
			{ label:'URI', text_content_field:'subject', link_href_field:'subject' },
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
		var menu = '<h1>Schema: '+escapeHTML(node.label||'')+'</h1>';
		menu += '<dl>';
		menu += '<dt>Label</dt><dd>'+escapeHTML(node.label)+'</dd>';
		menu += '<dt>Description</dt><dd>'+escapeHTML(node.description)+'</dd>';
		menu += '</dl>';
		menu += '<h2>Produces variants (transforms in domain of)</h2>';
		menu += '<table><thead>';
		menu += '<tr><th>Transform</th><th>Type</th><th>Range</th></tr>';
		menu += '</thead><tbody>';
		// SELECT * { $transform view:domain/rdf:rest*/rdf:first $schema . }
		db.match(null, rdf.createNamedNode(rdfFirst), rdf.createNamedNode(subject)).forEach(function(first){
			// Search the chain backwards until the predicate is either view:domain or *not* rdf:first
			while(1){
				var rest = db.match(null, rdf.createNamedNode(rdfRest), first.subject)[0];
				if(!rest) break;
				first = rest;
			}
			var domain = db.match(null, rdf.createNamedNode('http://magnode.org/view/domain'), first.subject)[0];
			if(domain){
				var type = db.match(domain.subject, rdf.createNamedNode(rdfType), null);
				var range = db.match(domain.subject, rdf.createNamedNode('http://magnode.org/view/range'), null);
				menu += '<tr><td>'+escapeHTML(domain.subject.toNT())+'</td>'
					+ '<td>'+type.map(function(r){return escapeHTML(r.object.toNT())}).join(', ')+'</td>'
					+ '<td>'+range.map(function(r){return escapeHTML(r.object.toNT())}).join(', ')+'</td></tr>';
			}
		});
		menu += '</tbody></table>';
		menu += '<h2>Instances</h2>';
		var newRef = Object.create(resources.variant);
		newRef.createNew = true;
		newRef.params = {};
		newRef.requiredTypes = ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody'];
		menu += '<div><a href="'+escapeHTMLAttr(relativeuri(input.rdf, input.request.uri, newRef.toURI()))+'">Create new instance</a></div>';
		menu += resources[targetType];
		var output = {'http://magnode.org/HTMLBody':menu};
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBJSONSchema";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:Core']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': 'type:HTMLBody'
	, 'view$nice': -1
	};
