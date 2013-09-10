/*
e.g. Transform:DocumentJSON_typeStreamJSON
	a view:ModuleTransform, view:Transform, view:PutTransform ;
	view:module "magnode/transform.Document_typeJSON" ;
	view:domain "request:application/json" ;
	view:range "media:application/json" .
*/
var util=require('util');
var url=require('url');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesType = db.getCollection(resourcesTypeFirst)[0];
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});

	var output = {};
	var request = resources.request;
	request.resume();

	if(!request.readable){
		if(input.requestDataBuffer===undefined) throw new Error("Request data undefined on a closed socket");
		end();
	}
	request.on("end", end);

	function end(){
		outputTypes.forEach(function(v){ output[v.toString()] = resources.requestDataBuffer.data; });
		callback(null, output);
	}
}
