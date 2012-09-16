/*
Transform:HTMLBodyField_typeNode_FieldLabel
	a view:Transform, view:ModuleTransform, view:ViewTransform;
	view:module "magnode/transform.HTMLBodyField_typeNode_FieldLabel" ;
	view:domain <http://magnode.org/field/line> ;
	view:range type:HTMLBodyField .
*/

var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function DHTMLBodyField_typeNode_FieldLabel(db, transform, input, render, callback){
	var inputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var outputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var inputResource = input[inputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<input name="value.'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'" type="text" class="field-label"/>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="string"/>';
	var ret = {};
	outputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
