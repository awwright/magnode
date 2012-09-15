/*
Transform:HTMLBodyField_typeNode_FieldPasswordConfirm
	a view:Transform, view:ModuleTransform, view:ViewTransform;
	view:module "magnode/transform.HTMLBodyField_typeNode_FieldPasswordConfirm" ;
	view:domain <http://magnode.org/field/shadow> ;
	view:range type:HTMLBodyField .
*/

var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '';
	out += '<div><input type="password" name="new.'+escapeHTMLAttr(name)+'" value="" class="field-password-a"/><small>Enter a new password to change your current password</small></div>';
	out += '<div><input type="password" name="confirm.'+escapeHTMLAttr(name)+'" value="" class="field-password-b"/><small>Confirm new password</small></div>';
	out += '<input type="hidden" name="value.'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'"/>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="shadow"/>';
	var ret = {};
	templateOutputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
