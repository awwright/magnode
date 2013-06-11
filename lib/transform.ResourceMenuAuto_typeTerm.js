/*
e.g. Transform:ResourceMenu_typeTerm
	a view:ModuleTransform, view:ViewTransform, view:FormTransform, view:DeleteFormTransform ;
	view:module "magnode/transform.ResourceMenuAuto_typeTerm" ;
	view:domain type:MongoDBJSONSchema ;
	view:range type:ResourceMenu ;
	view:nice 0 .
*/
module.exports = function ResourceMenuAuto_typeTerm(db, transform, resources, render, callback){
	var output = {};
	output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
	callback(null, output);
}
module.exports.URI = "http://magnode.org/transform/ResourceMenu_typeTerm";
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform', 'view:FormTransform', 'view:DeleteFormTransform']
	, 'view:domain': {$list:['type:Term']}
	, 'view:range': 'type:ResourceMenu'
	, 'view$nice': 0
	};
