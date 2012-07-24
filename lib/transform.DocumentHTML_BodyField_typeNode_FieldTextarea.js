/*
Transform:DocumentHTML_BodyField_typeNode_FieldTextarea
	a view:Transform, view:ModuleTransform, view:ViewTransform;
	view:module "magnode/transform.DocumentHTML_BodyField_typeNode_FieldTextarea" ;
	view:range type:DocumentHTML_BodyField ;
	view:domain <http://magnode.org/field/textarea> .
*/

var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function DocumentHTML_BodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<textarea name="value.'+escapeHTMLAttr(name)+'" class="field-textarea">'+escapeHTML(value)+'</textarea><input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="string"/>';
	var ret = {};
	templateOutputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
