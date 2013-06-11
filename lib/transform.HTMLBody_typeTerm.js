var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

module.exports = function HTMLBody_typeTerm(db, transform, input, render, callback){
	var node = input.node;
	var subject = node.subject;

	var targetType = 'http://magnode.org/HTMLBodyTable';
	var resources = Object.create(input);

	var doc =
		{ label: node.label
		, query:
			{ filter: {subject:{$exists:true}, type:subject}
			, fields:
				[ {name:'_id', type:'ObjectId'}
				, {name:'subject', type:'string', format:'uri'}
				, {name:'label', type:'string'}
				]
			}
		, subject: subject
		, type:
			[ 'http://magnode.org/MongoDB_List'
			, 'http://magnode.org/MongoDB_ListTable'
			]
		};

	resources['http://magnode.org/MongoDB_List'] = doc;
	resources['http://magnode.org/MongoDB_ListTable'] = doc;


	transformTypes = [];
	render.render(targetType, resources, transformTypes, haveRenderedForm);
	function haveRenderedForm(err, resources){
		if(err) return void callback(err);
		var url = escapeHTMLAttr(relativeuri(input.rdf,subject));
		var menu = '<h1>Term: '+escapeHTML(input.node&&input.node.label||'')+'</h1>';
		var output = {'http://magnode.org/HTMLBody':menu+resources[targetType]};
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeTerm";
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:Term']}
	, 'view:range': 'type:HTMLBody'
	, 'view$nice': -1
	};
