/*
Load the module provided by the view:module property.

e.g.
Transform:HTTP
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.HTTP" ;
	view:domain type:Document ;
	view:range type:HTTPResponse .
*/
module.exports = function(db, transform, input, render, callback){
	var module = db.filter({subject:transform,predicate:"http://magnode.org/view/module"});
	if(module[0]&&module[0].object){
		module = module[0].object.toString();
		if(input.log){
			//input.log("ModuleTransform: Transform "+transform+" run "+module+"("+util.inspect(input,false,0)+")");
		}
		var method = require(module);
		method(db, transform, input, render, callback);
	}else{
		console.error("ModuleTransform: No module to call");
	}
}
module.exports.URI = "http://magnode.org/view/ModuleTransform";
