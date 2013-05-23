/*
e.g. Transform:ResourceMenu_typeType
	a view:ModuleTransform, view:ViewTransform, view:FormTransform, view:DeleteFormTransform ;
	view:module "magnode/transform.ResourceMenuAuto_typeNode" ;
	view:domain type:Type ;
	view:range type:ResourceMenu ;
	view:nice 1 .
*/
var util=require('util');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function ResourceMenuAuto_typeNode(db, transform, resources, render, callback){
	var output = {};
	output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
	callback(null, output);
}
