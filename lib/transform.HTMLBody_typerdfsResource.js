var util=require('util');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

function htmlNode(node){
	if(node.nodeType()=='IRI') return "<a href=\""+escapeHTMLAttr(node.toString())+"\">"+escapeHTML(node.n3())+"</a>";
	else return escapeHTML(node.n3());
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var inputTypes = input.db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var outputTypes = input.db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input[inputTypes[0]];

	var data = input.db.filter({subject:input.resource});
	var result = "<style type=\"text/css\">.editor,.editor .editor_predicate,.editor .editor_object{width:100%;}</style>\n"
	           + "<h1>&lt;"+escapeHTML(input.resource)+"&gt;</h1><table class=\"editor\"><thead><tr><th>Predicate</th><th colspan=\"2\">Object</th></tr></thead><tbody>\n";
	for(var i=0; i<data.length; i++){
		//result += "<tr><td>"+escapeHTML(data[i].predicate)+"</td><td>"+escapeHTML(data[i].object.toString())+"</td><td>URI</td></tr>\n";
		result += "<tr><td>"+htmlNode(data[i].predicate)+"</td><td>"+htmlNode(data[i].object)+"</td></tr>\n";
	}
	result += "</tbody></table>\n";
	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	callback(output);
}
module.exports.URI = 'Transform:HTMLBody_typerdfsResource_Form';
//module.exports.about =
//	{ a: ['view:Transform', 'view:ViewTransform']
//	, 'view:domain': {$list:['rdfs:Resource']}
//	, 'view:range': 'type:HTMLBody'
//	};
