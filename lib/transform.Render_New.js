/*
Transform:Render_New
	a view:ModuleTransform ;
	view:module "transform.HTTPServer_Instance_typeHTTPServer"
	view:domain type:Render ;
	view:range type:Render_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/Render'];

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/db'}).map(function(v){return v.object});
	if(!q[0]){
		throw new Error('Could not find DBRDF for <'+subject+'>');
	}
	var transformStore = q[0];

	var resources = { db: input.db };
	var resourceTypes = db.filter({subject:transformStore, predicate:"rdf:type"}).map(function(v){return v.object});
	for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=transformStore;
	var router = render.render('http://magnode.org/DBRDF_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/DBRDF_Instance']) throw new Error('DBRDF <'+transformStore+'> for <'+subject+'> could not be created');
		var renders = new (require("magnode/view"))(r['http://magnode.org/DBRDF_Instance'],
			[ require('magnode/transform.Jade')
			] );
		callback({"http://magnode.org/Render_Instance":renders});
	})
}
module.exports.URI = "http://magnode.org/transform/Render_New";
