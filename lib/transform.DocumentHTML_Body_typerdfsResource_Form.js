/*
Transform:DocumentHTML_Body_typerdfsResource_Form
	a view:ModuleTransform, view:Transform ;
	view:module "magnode/transform.DocumentHTML_Body_typerdfsResource_Form" ;
	view:range type:DocumentHTML_Body  .
# Without a domain there's no page that will use this without an ?apply= paramater
*/
var util=require('util');
var url=require('url');

function htmlEscape(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function typeOption(node){
	var options = "";
	options += "<option"+(node.nodeType()=="IRI"?' selected="selected"':'')+'>URI</option>';
	options += "<option"+(node.nodeType()=="PlainLiteral"?' selected="selected"':'')+' value="@'+(node.language||"")+'">Lang</option>';
	options += "<option"+(node.nodeType()=="TypedLiteral"?' selected="selected"':'')+' value="'+(node.language||"")+'">Typed</option>';
	if(node.nodeType()=="BlankNode") options += '<option selected="selected">'+node.toString()+'</option>';
	options += "<option"+(node.nodeType()=="BlankNode"?' selected="selected"':'')+'>new bnode</option>';
	return options;
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = input.db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;})[0];
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();

	var action = url.parse(input.request.url, true);
	action.search = undefined;
	action.query.apply = ['Transform:Post-form-urlencoded',templateInverse];

	var data = input.db.filter({subject:input.resource});
	var result = "<style type=\"text/css\">.editor,.editor .editor_predicate,.editor .editor_object{width:100%;}</style>\n"
	           + "<form method=\"post\" action=\""+htmlEscape(url.format(action))+"\">\n"
	           + "<h1>&lt;"+htmlEscape(input.resource)+"&gt;</h1><table class=\"editor\"><thead><tr><th>Predicate</th><th colspan=\"2\">Object</th></tr></thead><tbody>\n";
	for(var i=0; i<data.length; i++){
		result += "<tr><td><input type=\"text\" class=\"editor_predicate\" name=\"field."+i+".predicate\" value=\""+htmlEscape(data[i].predicate)+"\"/></td><td><input type=\"text\" class=\"editor_object\" name=\"field."+i+".object\" value=\""+htmlEscape(data[i].object.toString())+"\"/></td><td><select name=\"field."+i+".type\">"+typeOption(data[i].object)+"</select></td></tr>\n";
	}
	result += "</tbody></table>\n";
	result += "<div><a href=\"javascript:;\" onclick=\"addStatement();\">New statment</a></div>";
	result += "<input type=\"hidden\" name=\"subject\" value=\""+htmlEscape(input.resource)+"\"/><input type=\"hidden\" name=\"field.length\" value=\""+data.length+"\"/><input type=\"submit\" value=\"Save\"/></form>";
	var output = {};
	for(var j=0;j<templateOutputType.length;j++){
		output[templateOutputType[j]] = result;
	}
	callback(output);
}
