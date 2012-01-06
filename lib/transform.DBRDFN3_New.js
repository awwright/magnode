/*
Transform:DBRDFN3_New
	a view:ModuleTransform ;
	view:module "magnode/transform.DBRDFN3_New" ;
	view:domain type:DBRDFN3 ;
	view:range type:DBRDFN3_Instance, type:DBRDF_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/DBRDFN3'];

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/file'});
	if(!q[0] || !q[0].object) throw new Error('No filename for <'+subject+'> found!');
	var filename = q[0].object.toString();

	var db = new (require("magnode/db.lazy"))(
		{ file: filename
		, format: "n3"
		} );
	callback({"http://magnode.org/DBRDFN3_Instance":db, "http://magnode.org/DBRDF_Instance":db});
}
module.exports.URI = "http://magnode.org/transform/DBRDFN3_New";
