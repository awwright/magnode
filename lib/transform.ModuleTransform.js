/*
Load the module provided by the view:module property.

e.g. Transform:{Whatever}
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "{whatever}" ;
	view:domain type:Document ;
	view:range type:HTTPResponse .
*/

module.exports = function(db, transform, input, render, callback){
	var module = db.match(transform,"http://magnode.org/view/module");
	if(module[0]&&module[0].object){
		module = module[0].object.toString().replace(/^file:\/\//,'');
		var method = require(module);
		method(db, transform, input, render, callback);
	}else{
		callback(new Error("ModuleTransform: No module to call"));
	}
}
module.exports.URI = 'http://magnode.org/view/ModuleTransform';
