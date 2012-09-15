/*
Transform:HTMLBody_typerdfsResource_Form
	a view:ModuleTransform, view:Transform ;
	view:module "magnode/transform.HTMLBody_typerdfsResource_Form" ;
	view:range type:HTMLBody ;
	view:domain rdfs:Resource .
*/
var util=require('util');

function htmlEscape(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlNode(node){
	if(node.nodeType()=='IRI') return "<a href=\""+node.toString()+"\">"+htmlEscape(node.n3())+"</a>";
	else return htmlEscape(node.n3());
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();

	var data = input.db.filter({subject:input.resource});
	var result = "<style type=\"text/css\">.editor,.editor .editor_predicate,.editor .editor_object{width:100%;}</style>\n"
	           + "<h1>&lt;"+htmlEscape(input.resource)+"&gt;</h1><table class=\"editor\"><thead><tr><th>Predicate</th><th colspan=\"2\">Object</th></tr></thead><tbody>\n";
	for(var i=0; i<data.length; i++){
		//result += "<tr><td>"+htmlEscape(data[i].predicate)+"</td><td>"+htmlEscape(data[i].object.toString())+"</td><td>URI</td></tr>\n";
		result += "<tr><td>"+htmlNode(data[i].predicate)+"</td><td>"+htmlNode(data[i].object)+"</td></tr>\n";
	}
	result += "</tbody></table>\n";
	var output = {};
	for(var j=0;j<templateOutputType.length;j++){
		output[templateOutputType[j]] = result;
	}
	callback(output);
}
