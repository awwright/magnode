/*
Transform:HTMLBodyField_typeNode_FieldJSON
	a view:Transform, view:ModuleTransform, view:ViewTransform;
	view:module "magnode/transform.HTMLBodyField_typeNode_FieldJSON" ;
	view:domain <http://magnode.org/field/json> ;
	view:range type:HTMLBodyField .
*/

var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldJSON(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<textarea name="value.'+escapeHTMLAttr(name)+'" class="field-json">'+escapeHTMLAttr(JSON.stringify(value,null,"\t"))+'</textarea><input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="json"/>';
	var ret = {};
	templateOutputType.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
