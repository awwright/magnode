/*
Transform:DBHtdigest_New
	a view:ModuleTransform, view:NewServiceTransform ;
	view:module "transform.DBHtdigest_New" ;
	view:domain type:DBHtdigest ;
	view:range type:DBHtdigest_Instance .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/DBHtdigest'];

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/file'});
	if(!q[0] || !q[0].object){
		throw new Error('No filename provided');
		return;
	}
	var filename = q[0].object;

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/prefix'});
	if(!q[0] || !q[0].object){
		throw new Error('No user URI prefix provided');
		return;
	}
	var prefix = q[0].object;

	var dbHtdigest = new (require("magnode/db.auth-htdigest"))(filename.toString(), prefix);
	callback({"http://magnode.org/DBHtdigest_Instance":dbHtdigest});
}
module.exports.URI = "http://magnode.org/transform/DBHtdigest_New";
