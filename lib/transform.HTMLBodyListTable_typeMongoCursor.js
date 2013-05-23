/*
It's more appropriate to store the corresponding Lists transform definition here
*/
var util=require('util');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeuri=require('./relativeuri');

function renderField(name, type, value, rdf){
	switch(type.type){
		case 'ObjectId': return 'ObjectId(<code>'+escapeHTML(value)+'</code>)';
		case 'string':
			switch(type.format){
				case 'uri': return '<a href="'+escapeHTMLAttr(relativeuri(rdf, value))+'">'+escapeHTML(value)+'</a>';
				default: return escapeHTML(value);
			}

		case 'array':
		case 'json': return '<pre>'+escapeHTML(util.inspect(value,false,10))+'</pre>';
		default: return '<pre>'+escapeHTML(util.inspect(value))+'</pre>';
	}
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var cursor = input['http://magnode.org/MongoCursorTable'];
	var query = input['http://magnode.org/MongoDB_ListTable'].query;
	var renderedPosts = [];

	var headerHTML = [];
	var fields = query.fields || [{type:'ObjectId', name:'_id'}, {type:'string', format:'uri', name:'subject' }];
	for(var n in query.fields){
		headerHTML.push("<th>" + (fields[n]&&(fields[n].title||fields[n].label||fields[n].name) || n ||"") + "</th>");
	}

	var tableHTML = [];
	cursor.next(function nextResult(err, result){
		if(err) return finishedPosts(err);
		if(!result) return finishedPosts(null);

		var cells = [];
		for(var i=0; i<fields.length; i++){
			var n=fields[i].name;
			cells.push("<td>"+(result[n]!==undefined?renderField(n, fields[i], result[n], input.rdf):"<i>undefined</i>")+"</td>");
		}
		tableHTML.push('<tr>'+cells.join('')+'</tr>');

		cursor.next(nextResult);
	});

	var result;
	var targetType = 'http://magnode.org/HTMLBodyPager';
	function finishedPosts(err){
		if(err) return void callback(err);
		result =
			'<div>'
			//+ '<pre>'+require('util').inspect(query)+'</pre>'
			+ '<table>'
			+ '<thead><tr>'+headerHTML.join("")+'</tr></thead>'
			+ '<tbody>'+tableHTML.join("")+'</tbody>'
			+ '</table>'
			+ '</div>';

		var resources = {'http://magnode.org/MongoCursor': cursor};
		for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];
		transformTypes = [];
		render.render(targetType, resources, transformTypes, haveRenderedPager);
	}
	function haveRenderedPager(err, resources){
		if(err) return void callback(err);
		result += resources[targetType];
		var output = {};
		outputType.forEach(function(v){ output[v] = result; });
		callback(null, output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBody_typeMongoCursorTable';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoCursorTable']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyTable']
	, 'rdfs:seeAlso':
		{ id: 'http://magnode.org/transform/MongoCursorTable_typeMongoDB_List'
		, a: ['view:ModuleTransform', 'view:Transform', 'view:ViewTransform']
		, 'view:module': 'magnode/transform.MongoCursor_typeMongoDB_List'
		, 'view:domain': {$list:['type:MongoDB_ListTable']}
		, 'view:range': 'type:MongoCursorTable'
		}
	};
