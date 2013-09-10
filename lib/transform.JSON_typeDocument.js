/*
e.g. Transform:JSON_typeDocument
	a view:ModuleTransform, view:Transform, view:PutTransform ;
	view:module "magnode/transform.Document_typeJSON" ;
	view:domain "media:application/json" ;
	view:range type:Post .
*/
var util=require('util');
var url=require('url');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var result = JSON.parse(resources[resourcesTypes[0]]);
	var output = {};
	outputTypes.forEach(function(v){output[v.toString()]=result;});
	callback(null, output);
}
