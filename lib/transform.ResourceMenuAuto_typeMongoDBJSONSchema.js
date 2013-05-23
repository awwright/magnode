/*
e.g. Transform:ResourceMenu_typeMongoDBJSONSchema
	a view:ModuleTransform, view:ViewTransform, view:FormTransform, view:DeleteFormTransform ;
	view:module "magnode/transform.ResourceMenuAuto_typeMongoDBJSONSchema" ;
	view:domain type:MongoDBJSONSchema ;
	view:range type:ResourceMenu ;
	view:nice 0 .
*/
module.exports = function ResourceMenuAuto_typeMongoDBJSONSchema(db, transform, resources, render, callback){
	var output = {};
	output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
	output['http://magnode.org/ResourceMenu'].push({title:'New',href:'?new'});
	callback(null, output);
}
module.exports.URI = "http://magnode.org/transform/ResourceMenu_typeMongoDBJSONSchema";
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform', 'view:FormTransform', 'view:DeleteFormTransform']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': 'type:ResourceMenu'
	, 'view$nice': 0
	};
