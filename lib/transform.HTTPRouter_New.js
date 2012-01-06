/*
Transform:HTTPRouter_Instance_typeHTTPRouter
	a view:ModuleTransform ;
	view:module "transform.HTTPRouter_Instance_typeHTTPRouter"
	view:domain type:HTTPRouter ;
	view:range type:HTTPRouter_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/HTTPRouter'];
	var router = new (require("magnode/route"));
	callback({"http://magnode.org/HTTPRouter_Instance":router});

	var hooks = input.db.filter({subject:subject,predicate:'http://magnode.org/register'}).map(function(v){return v.object;});
	// TODO detect if this is a Collection and if so, iterate that collection
	/** Parallel query */
	var remaining = hooks.length;
	var end;
	for(var i=0; i<hooks.length; i++){
		var resources = { db: input.db };
		var resourceTypes = db.filter({subject:hooks[i], predicate:"rdf:type"}).map(function(v){return v.object});
		for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=hooks[i];
		render.render('http://magnode.org/HTTPRouter_Hook', resources, [], function(r){
			remaining--;
			if(!r || !r['http://magnode.org/HTTPRouter_Hook']) throw new Error('Hook <'+hooks[i]+'> in router <'+subject+'> could not be processed');
			if(end) end();
		});
	}
	end = function(){
		if(remaining===false) return;
		if(remaining===0){
			remaining=false;
			// All hooks launched...
		}
	}
	end();
}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Instance_typeHTTPRouter";
