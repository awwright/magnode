/*
Transform:AuthPasswordDigest_New
	a view:ModuleTransform, view:NewServiceTransform ;
	view:module "transform.AuthPasswordDigest_New"
	view:domain type:AuthPasswordDigest ;
	view:range type:AuthPasswordDigest_Instance, type:AuthPassword_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/AuthPasswordDigest'];

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/realm'});
	if(!q[0] || !q[0].object){
		throw new Error('No realm found for '+subject);
		return false;
	}
	var realm = q[0].object.toString();

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/db'});
	if(!q[0] || !q[0].object){
		throw new Error('No credential source found for '+subject);
		return false;
	}
	var store = q[0].object;

	var resources = { db: input.db };
	var resourceTypes = db.filter({subject:store, predicate:"rdf:type"}).map(function(v){return v.object});
	for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=store;

	var router = render.render('http://magnode.org/DBHtdigest_Instance', resources, [], function(r){
		if(!r) throw new Error('Password store <'+store+'> for <'+subject+'> could not be created');
		var authDigest = new (require("magnode/authentication.digest"))(r['http://magnode.org/DBHtdigest_Instance'], realm );
		callback({"http://magnode.org/AuthPasswordDigest_Instance":authDigest, "http://magnode.org/AuthPassword_Instance":authDigest});
	})


}
module.exports.URI = "http://magnode.org/transform/AuthPasswordDigest_New";
