/*
Transform:SomeTransform
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.autoHTMLBodyForm" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var url=require('url');
var schema=require('./schema');

function htmlEscape(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTypeString(node){
	if(typeof(node)=="string") return "URI";
	if(!node) return "";
	if(typeof(node.language)=="string") return "@"+node.language;
	if(typeof(node.type)=="string") return node.type;
	return "";
}

function renderField(name, type, value){
	switch(type.type){
		case 'ObjectId': return '<input name="value.'+htmlEscape(name)+'" value="'+htmlEscape(value)+'"/><input type="hidden" name="type.'+htmlEscape(name)+'" value="ObjectId"/>';
		case 'string':
			switch(type.format){
				case 'uri':
				case 'email':
				case 'http://magnode.org/line':
					return '<input name="value.'+htmlEscape(name)+'" value="'+htmlEscape(value)+'"/><input type="hidden" name="type.'+htmlEscape(name)+'" value="string"/>';
				default: return '<textarea name="value.'+htmlEscape(name)+'">'+htmlEscape(value)+'</textarea><input type="hidden" name="type.'+htmlEscape(name)+'" value="string"/>';
			}
		case 'array':
		case 'json': return '<textarea name="value.'+htmlEscape(name)+'">'+htmlEscape(JSON.stringify(value))+'</textarea><input type="hidden" name="type.'+htmlEscape(name)+'" value="json"/>';
		default: return '<pre>'+util.inspect(value)+'</pre>';
	}

}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	var fields = [];
	var node = input.node;

	input['db-mongodb-schema'].findOne({subject:templateInputType[0]}, function(err, schema){
		if(!node.subject) node.subject=node.resource;

		var properties = schema&&schema.schema&&schema.schema.properties||{};
		var fieldNames = [];

		for(var n in properties){
			fields.push("<dt>"+htmlEscape(n)+"</dt><dd>"+renderField(n, properties[n], node[n]||"")+"</dd>");
			fieldNames.push(n);
		}

		for(var n in node){
			if(properties[n]) continue;
			fields.push("<dt>"+htmlEscape(n)+"</dt><dd>"+renderField(n, {type:"json"}, node[n])+"</dd>");
			fieldNames.push(n);
		}

		var action = url.parse(input.request.url, true);
		delete(action.search);
		delete(action.query.new);
		action.query.edit=true;
		//action.query.apply = ['http://magnode.org/transform/Post-form-urlencoded',templateInverse[0]];
		result =
			'<form action="'+htmlEscape(url.format(action))+'" method="post">'
			+ "<dl>"+fields.join("")+"</dl>"
			+ '<input type="hidden" name="_id" value="'+htmlEscape(node._id||"")+'"/>'
			+ '<input type="hidden" name="fields" value="'+htmlEscape(JSON.stringify(fieldNames))+'"/>'
			+ '<input type="submit" value="Submit"/>'
			+ '</form>';
		var output = {};
		for(var j=0;j<templateOutputType.length;j++){
			output[templateOutputType[j]] = result;
		}
		callback(output);
	});
}
