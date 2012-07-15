/*
Transform:DocumentHTML_BodyField_typeNode_FieldURI
	a view:Transform, view:ModuleTransform, view:ViewTransform;
	view:module "magnode/transform.DocumentHTML_BodyField_typeNode_FieldURI" ;
	view:range type:DocumentHTML_BodyField ;
	view:domain <http://magnode.org/field/uri> .
*/

var escapeHTML = require('./htmlutils').escapeHTML;

module.exports = function DocumentHTML_BodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<input name="value.'+escapeHTML(name)+'" value="'+escapeHTML(value)+'" class="field-uri"/><input type="hidden" name="format.'+escapeHTML(name)+'" value="string"/>';
	var ret = {};
	templateOutputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
