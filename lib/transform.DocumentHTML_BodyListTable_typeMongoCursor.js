/*
Transform:MongoCursorTable_typeMongoDB_List
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.MongoCursor_typeMongoDB_List" ;
	view:domain type:MongoDB_ListTable ;
	view:range type:MongoCursorTable . Transform:DocumentHTML_Body_typeMongoCursorTable
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.DocumentHTML_BodyListTable_typeMongoCursor" ;
	view:domain type:MongoDB_List, type:MongoCursorTable ;
	view:range type:DocumentHTML_Body .
*/
/*
It's more appropriate to store the corresponding Lists transform definition here
*/
var util=require('util');
var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

function renderField(name, type, value){
	switch(type.type){
		case 'ObjectId': return 'ObjectId(<code>'+escapeHTML(value)+'</code>)';
		case 'string':
			switch(type.format){
				case 'uri': return '<a href="'+escapeHTMLAttr(value)+'">'+escapeHTML(value)+'</a>';
				default: return escapeHTML(value);
			}

		case 'array':
		case 'json': return '<pre>'+escapeHTML(util.inspect(value,false,10))+'</pre>';
		default: return '<pre>'+escapeHTML(util.inspect(value))+'</pre>';
	}
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var cursor = input['http://magnode.org/MongoCursorTable'];
	var query = input['http://magnode.org/MongoDB_ListTable'].query;
	var renderedPosts = [];

	var headerHTML = [];
	var fields = query.fields;
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
			cells.push("<td>"+(result[n]!==undefined?renderField(n, fields[i], result[n]):"undefined")+"</td>");
		}
		tableHTML.push('<tr>'+cells.join('')+'</tr>');

		cursor.next(nextResult);
	});

	function finishedPosts(err){
		if(err) callback(err);
		var result =
			'<div>'
			//+ '<pre>'+require('util').inspect(query)+'</pre>'
			+ '<table>'
			+ '<thead><tr>'+headerHTML.join("")+'</tr></thead>'
			+ '<tbody>'+tableHTML.join("")+'</tbody>'
			+ '</table>'
			+ '</div>';
		var output = {};
		for(var j=0;j<outputType.length;j++){
			output[outputType[j]] = result;
		}
		callback(output);
	}
}
