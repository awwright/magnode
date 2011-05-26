/*
Load the module provided by the view:module property.

e.g.
Transform:HTTP
	a view:ModuleTransform ;
	view:module "transform.HTTP" ;
	view:range type:HTTPResponse ;
	view:domain type:Document .
*/
module.exports = function(db, transform, input, callback){
	var module = db.filter({subject:transform,predicate:"http://magnode.org/view/module"});
	if(module[0]&&module[0].object){
		module = module[0].object.toString();
		if(input.log){
			//input.log("ModuleTransform: Transform "+transform+" run "+module+"("+util.inspect(input,false,0)+")");
		}
		var method = require(module);
		method(db, transform, input, callback);
	}
}
module.exports.URI = "http://magnode.org/view/ModuleTransform";
