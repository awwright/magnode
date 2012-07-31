/*
e.g. Transform:DocumentHTML_Body_typeType_Table
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Table" ;
	view:domain type:TypeTable ;
	view:range type:DocumentHTML_Body .
*/
var util=require('util');
var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

function getTypeString(node){
	if(typeof(node)=="string") return "URI";
	if(!node) return "";
	if(typeof(node.language)=="string") return "@"+node.language;
	if(typeof(node.type)=="string") return node.type;
	return "";
}

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
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	var node = input.node;
	var subject = node.subject;

	var action = url.parse(input.request.url, true);
	if(!node.subject) node.subject=node.resource;

	input['db-mongodb-schema'].findOne({subject:subject}, function(err, schema){
		if(err) throw new Error(err);

		var properties = schema&&schema.schema&&schema.schema.properties || {};
		var fields = {};
		for(var n in properties) fields[n]=1;

		var query = input['db-mongodb'].find({type:subject}, fields);

		// Add a limit and offset, but only if we're told to
		var limit = action.query.limit?parseInt(action.query.limit):20;
		if(action.query.offset){
			query.skip(parseInt(action.query.offset));
			query.limit(limit);
		}else if(action.query.page){
			query.skip(parseInt(action.query.page)*limit);
			query.limit(limit);
		}else if(action.query.limit){
			query.limit(limit);
		}

		query.toArray(function(err, list){
			if(err) throw new Error(err);

			var fieldNames = [];

			var headerHTML = [];
			for(var n in properties){
				headerHTML.push("<th>" + (properties[n]&&properties[n].title || n ||"") + "</th>");
			}

			var tableHTML = [];
			for(var i=0; i<list.length; i++){
				var fields = [];
				for(var n in properties){
					fields.push("<td>"+(list[i][n]!==undefined?renderField(n, properties[n], list[i][n]):"undefined")+"</td>");
					fieldNames.push(n);
				}
				tableHTML.push('<tr>'+fields.join('')+'</tr>');
			}

			result =
				'<div>'
				//+ '<pre>'+JSON.stringify(action.query)+'</pre>'
				//+ '<pre>nodes.find({type:'+JSON.stringify(subject)+'}) =\n'+JSON.stringify(list)+'</pre>'
				+ '<table>'
				+ '<thead><tr>'+headerHTML.join("")+'</tr></thead>'
				+ '<tbody>'+tableHTML.join("")+'</tbody>'
				+ '</table>'
				+ '</div>';
			var output = {};
			for(var j=0;j<templateOutputType.length;j++){
				output[templateOutputType[j]] = result;
			}
			callback(output);
		});
	});
}
