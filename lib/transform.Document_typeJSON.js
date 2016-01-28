/*
e.g. Transform:DocumentJSON_typeContentType
	a view:ModuleTransform, view:GetTransform ;
	view:module "magnode/transform.Document_typeJSON" ;
	view:domain type:ContentType ;
	view:range type:Document, type:DocumentJSON, "media:application/json" .
*/
var util=require('util');
var url=require('url');

var serializeJSON = require('./mongoutils').serializeJSON;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var result = serializeJSON(resources[resourcesTypes[0]]);
	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	output['HTTP-Content-Type'] = 'application/json';
	callback(null, output);
}
