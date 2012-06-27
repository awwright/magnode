/*
e.g. Transform:DocumentHTML_BodyAuto_typeType_Form
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Form" ;
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
	if(type.readonly){
		return '<pre>'+util.inspect(value)+'</pre><input type="hidden" name="format.'+htmlEscape(name)+'" value="noop"/>';
	}
	switch(type.format){
		case 'uri':
		case 'email':
		case 'http://magnode.org/line':
		case 'http://magnode.org/field/line':
			return '<input name="value.'+htmlEscape(name)+'" value="'+htmlEscape(value)+'"/><input type="hidden" name="format.'+htmlEscape(name)+'" value="string"/>';
		case 'http://magnode.org/field/textarea':
			return '<textarea name="value.'+htmlEscape(name)+'">'+htmlEscape(value)+'</textarea><input type="hidden" name="format.'+htmlEscape(name)+'" value="string"/>';
		case 'http://magnode.org/field/checkbox':
			return '<input type="check" name="value.'+htmlEscape(name)+'" value="1"'+(value?' checked="checked"':'')+'/><input type="hidden" name="format.'+htmlEscape(name)+'" value="checkbox"/>';
		case 'json':
			return '<textarea name="value.'+htmlEscape(name)+'">'+htmlEscape(JSON.stringify(value,null,"\t"))+'</textarea><input type="hidden" name="format.'+htmlEscape(name)+'" value="json"/>';
	}
	switch(type.type){
		case 'ObjectId':
			return '<input name="value.'+htmlEscape(name)+'" value="'+htmlEscape(value)+'"/><input type="hidden" name="format.'+htmlEscape(name)+'" value="ObjectId"/>';
		case 'shadow':
			return '<div><input type="password" name="value.'+htmlEscape(name)+'" value=""/></div><div><input type="password" name="confirm.'+htmlEscape(name)+'" value=""/></div><input type="hidden" name="format.'+htmlEscape(name)+'" value="shadow"/>';
		case 'object':case 'json':
			return '<textarea name="value.'+htmlEscape(name)+'">'+htmlEscape(JSON.stringify(value,null,"\t"))+'</textarea><input type="hidden" name="format.'+htmlEscape(name)+'" value="json"/>';
		default:
			return '<pre>'+htmlEscape(util.inspect(value))+'</pre><input type="hidden" name="format.'+htmlEscape(name)+'" value="noop"/>';
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
	var tail = [];
	var node = input.node;

	input['db-mongodb-schema'].findOne({subject:templateInputType[0]}, function(err, schema){
		if(!node.subject) node.subject=node.resource;

		var properties = schema&&schema.schema&&schema.schema.properties||{};
		var fieldNames = [];

		for(var n in properties){
			switch(properties[n].format){
				case 'hidden': tail.push('<input type="hidden" name="format.'+htmlEscape(n)+'" value="noop"/>');
					continue;
			}
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+htmlEscape(fieldTitle)+"</dt><dd>"+renderField(n, properties[n], node[n]||(properties[n].default===undefined?"":properties[n].default))+"</dd>");
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
			+ tail.join('');
			+ '</form>';
		var output = {};
		for(var j=0;j<templateOutputType.length;j++){
			output[templateOutputType[j]] = result;
		}
		callback(output);
	});
}
