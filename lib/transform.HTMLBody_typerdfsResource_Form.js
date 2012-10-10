/*
Without a domain there's no page that will use this without an ?apply= paramater
*/
var util=require('util');
var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

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
	var inputTypes = input.db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputTypes = input.db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var templateInverse = input.db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;})[0];
	var inputResource = input[inputTypes[0]];

	var action = url.parse(input.request.url, true);
	action.search = undefined;
	action.query.apply = ['Transform:Post-form-urlencoded',templateInverse];

	var data = input.db.match(input.resource);
	var result = "<style type=\"text/css\">.editor,.editor .editor_predicate,.editor .editor_object{width:100%;}</style>\n"
	           + "<form method=\"post\" action=\""+escapeHTMLAttr(url.format(action))+"\">\n"
	           + "<h1>&lt;"+escapeHTML(input.resource)+"&gt;</h1><table class=\"editor\"><thead><tr><th>Predicate</th><th colspan=\"2\">Object</th></tr></thead><tbody>\n";
	for(var i=0; i<data.length; i++){
		result += "<tr><td><input type=\"text\" class=\"editor_predicate\" name=\"field."+i+".predicate\" value=\""+escapeHTMLAttr(data[i].predicate)+"\"/></td><td><input type=\"text\" class=\"editor_object\" name=\"field."+i+".object\" value=\""+escapeHTMLAttr(data[i].object.toString())+"\"/></td><td><select name=\"field."+i+".type\">"+typeOption(data[i].object)+"</select></td></tr>\n";
	}
	result += "</tbody></table>\n";
	result += "<div><a href=\"javascript:;\" onclick=\"addStatement();\">New statment</a></div>";
	result += "<input type=\"hidden\" name=\"subject\" value=\""+escapeHTMLAttr(input.resource)+"\"/><input type=\"hidden\" name=\"field.length\" value=\""+data.length+"\"/><input type=\"submit\" value=\"Save\"/></form>";
	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	callback(output);
}
module.exports.URI = 'Transform:HTMLBody_typerdfsResource_Form';
//module.exports.about =
//	{ a: ['view:Transform', 'view:FormTransform']
//	, 'view:domain': {$list:[]}
//	, 'view:range': 'type:HTMLBody'
//	};
