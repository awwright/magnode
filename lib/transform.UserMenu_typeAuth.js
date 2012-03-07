/*
Transform:UserMenu_typeAuth
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.UserMenu_typeAuth.js" ;
	view:domain type:Auth ;
	view:range type:UserMenu .
*/

module.exports = function(db, transform, input, render, callback){
	var auth = input['http://magnode.org/Auth'];
	var u = auth&&auth.authenticateRequest(input['request']);
	var menu = {};
	if(u){
		menu = u;
		menu.username = menu.id;
	}
	callback({"http://magnode.org/UserMenu":menu});
}
module.exports.URI = "http://magnode.org/transform/UserMenu_typeAuth";
