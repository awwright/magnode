/*
It's more appropriate to store the corresponding Lists transform definition here
*/
var util=require('util');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeuri=require('./relativeuri');

function renderField(type, value, rdf){
	if(typeof type.f=='function'){
		return type.f(type, value, rdf);
	}
	if(type.field||type.name){
		value = value[type.field||type.name];
	}
	if(value===undefined){
		return '<i>undefined</i>';
	}
	switch(type.type){
		case 'ObjectId': return 'ObjectId(<code><a href="ObjectId/'+escapeHTML(value)+'">'+escapeHTML(value)+'</a></code>)';
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
module.exports = function(db, transform, resources, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var cursor = resources['http://magnode.org/MongoCursorTable'];
	var query = resources['http://magnode.org/MongoDB_ListTable'].query;
	var renderedPosts = [];

	var headerHTML = [];
	var fields = query.fields || [{type:'ObjectId', name:'_id'}, {type:'string', format:'uri', name:'subject' }];
	for(var n in query.fields){
		var label = fields[n]&&(fields[n].title||fields[n].label||fields[n].name) || n ||"";
		headerHTML.push("<th>" + escapeHTML(label) + "</th>");
	}

	var tableHTML = [];
	cursor.next(function nextResult(err, result){
		if(err) return void finishedPosts(err);
		if(!result) return void finishedPosts(null);

		var cells = '';
		fields.forEach(function(f){
			cells += "<td>"+renderField(f, result, resources.rdf)+"</td>";
		});
		tableHTML.push('<tr>'+cells+'</tr>');

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
		cursor.count(function(err, recordCount){
			var input = {};
			//input.variant = resources.variant;
			input['http://magnode.org/Pager'] = {offset:cursor.pager.offset, limit:cursor.pager.limit, recordCount:recordCount};
			for(var n in input) if(!Object.hasOwnProperty.call(input, n)) input[n] = input[n];
			transformTypes = [];
			render.render(targetType, input, transformTypes, haveRenderedPager);
		});
	}
	function haveRenderedPager(err, pager){
		if(err) return void callback(err);
		result += pager[targetType];
		var output = {};
		outputType.forEach(function(v){ output[v] = result; });
		callback(null, output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBody_typeMongoCursorTable';
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list:['type:MongoCursorTable']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyTable']
	, 'rdfs:seeAlso':
		{ id: 'http://magnode.org/transform/MongoCursorTable_typeMongoDB_List'
		, a: ['view:ModuleTransform', 'view:Transform', 'view:GetTransform']
		, 'view:module': 'magnode/transform.MongoCursor_typeMongoDB_List'
		, 'view:domain': {$list:['type:MongoDB_ListTable']}
		, 'view:range': 'type:MongoCursorTable'
		}
	};
