var util=require("util");
var url=require('url');

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

var formSchema =
	{ type: 'object'
	, label: 'Columns'
	, properties:
		{ fields:
			{ type:'array'
			, items:
				{ type:'object'
				, properties:
					{ name: {type:'string'}
					, label: {type:'string'}
					, type: {type:'string', default:'string'}
					}
				, additionalProperties: false
				}
			}
		}
	, additionalProperties: false
	};

module.exports = function(db, transform, resources, render, callback){
	var doc = resources["http://magnode.org/MongoDBCollection"];
	var body = '<h1>MongoDB Collection <i>'+escapeHTML(doc.collection)+'</i></h1>';
	body += '<p>Accessing resource: '+escapeHTML(doc.collection)+'</p>';
	body += '<p><a href="schema">Create View/Schema</a></p>';

	var fields = [];

	doc.db.collection(doc.collection).indexes(haveIndexes);
	function haveIndexes(err, indexes){
		if(!indexes){
			body += '<h2>Error</h2><pre>'+util.inspect(err)+'</pre>';
			return void callback(null, {"http://magnode.org/HTMLBody":body});
		}
		body += '<h2>Indexes</h2><table><thead><tr><th>Index Name</th><th>Data</th></tr></thead><tbody>';
		for(var i=0; i<indexes.length; i++){
			body += '<tr><td><pre>'+escapeHTML(indexes[i].name)+'</pre></td><td><pre>'+escapeHTML(util.inspect(indexes[i]))+'</pre></td></tr>'
		}
		body += '</tbody></table>';

		function formatId(type, value, rdf){
			var id = value._id.toString();
			if(typeof value._id=='number'){
				return 'Number(<code><a href="Number/'+escapeHTML(id)+'">'+escapeHTML(id)+'</a>)';
			}else if(typeof value._id=='string'){
				return 'Number(<code><a href="String/'+escapeHTML(id)+'">'+escapeHTML(id)+'</a>)';
			}else{
				return 'ObjectId(<code><a href="ObjectId/'+escapeHTML(id)+'">'+escapeHTML(id)+'</a></code>)';
			}
		}

		fields.push({name:'_id',type:'ObjectId',f:formatId});

		var query = url.parse(resources.request.url, true).query;
		var targetType = 'http://magnode.org/FieldValue';
		var input = {};
		input['http://magnode.org/fieldpost/Object'] = Object.create(formSchema);
		input['http://magnode.org/fieldpost/Object'].name = '';
		input['http://magnode.org/FormFieldData'] = query;
		transformTypes = ['http://magnode.org/view/FormDataTransform'];
		render.render(targetType, input, transformTypes, renderForm);
	}

	function renderForm(err, res){
		if(err) return void callback(err);
		var query = res['http://magnode.org/FieldValue'];
		if(Array.isArray(query&&query.fields)){
			fields = fields.concat(query.fields);
		}

		// Now render the form to edit the current view
		var targetType = 'http://magnode.org/HTMLBodyField';
		var fieldType = 'http://magnode.org/field/object';
		var input = Object.create(resources);
		input[fieldType] = Object.create(formSchema);
		input[fieldType].value = query;
		var transformTypes = ['http://magnode.org/view/PutFormTransform'];
		render.render(targetType, input, transformTypes, renderDocuments);
	}

	function renderDocuments(err, res){
		if(err) return void callback(err);
		var form = res['http://magnode.org/HTMLBodyField'];

		body += '<h2>Documents</h2>'
			+ '<fieldset><legend>Change Columns/Table</legend>'
			+ '<form action="?" method="get">'
			+ form
			+ '<input type="submit" value="Render"/>'
			+ '</form>'
			+ '</fieldset>';

		// Render the table of documents
		var query =
			{ name:'documents'
			, query:
				{ fields: fields
				, filter: {}
				, collection: doc.collection
				}
			, type:
				[ 'http://magnode.org/MongoDB_List'
				, 'http://magnode.org/MongoDB_ListTable'
				]
			};

		var targetType = 'http://magnode.org/HTMLBodyTable';
		var inputs = Object.create(resources);
		inputs['http://magnode.org/MongoDB_List'] = query;
		inputs['http://magnode.org/MongoDB_ListTable'] = query;
		transformTypes = [];
		render.render(targetType, inputs, transformTypes, haveRenderedForm);
		function haveRenderedForm(err, resources){
			if(err) return void callback(err);
			body += resources[targetType];
			callback(null, {"http://magnode.org/HTMLBody":body});
		}
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBCollection";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoDBCollection']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
