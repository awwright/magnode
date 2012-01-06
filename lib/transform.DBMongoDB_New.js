/*
Transform:DBMongoDB_New
	a view:ModuleTransform ;
	view:module "magnode/transform.DBMongoDB_New" ;
	view:domain type:DBMongoDB ;
	view:range type:DBMongoDB_Instance .
*/
module.exports = function Transform$DBMongoDB_New(db, transform, input, render, callback){
	var subject = input['http://magnode.org/DBMongoDB'];

	var q = input.db.filter({subject:subject, predicate:'http://magnode.org/mongodbConnection'});
	if(!q[0] || !q[0].object) throw new Error('No mongodbConnection for <'+subject+'> found!');
	var dbname = q[0].object.toString().split(/\//g);
	if(dbname.length!=3) throw new Error('Invalid mongodbConnection '+dbname+' for <'+subject+'>');

	var mongodb = new (require('mongolian'));
	var dbClient = mongodb.db(dbname[1]);
	var db = dbClient.collection(dbname[2]);

	callback({"http://magnode.org/DBMongoDB_Instance":db});
}
module.exports.URI = "http://magnode.org/transform/DBMongoDB_New";
