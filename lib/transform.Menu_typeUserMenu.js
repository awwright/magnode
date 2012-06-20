/*
Generates a list of menu items for a user to manage their account (edit, view, logout, login, etc.)

e.g. Transform:Menu_typeUserMenu
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:menuItemContentTypes type:Raw, type:Page ;
	view:module "magnode/transform.Menu_typeUserMenu" ;
	view:domain type:UserMenu .
	view:range type:Menu_UserMenu .
*/

module.exports = function(db, transform, input, render, callback){
	var outTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var contentType = "http://magnode.org/UserMenu";
	var auth = input[contentType];
	var menuItems = [];
	if(auth.id){
		if(auth.username) menuItems.push({href:auth.id,value:auth.username});
		menuItems.push({href:auth.id,value:"Account"});
	}
	menuItems.push({href:"/?logout",value:"Logout"});
	var r = {};
	for(var i=0; i<outTypes.length; i++) r[outTypes[i]]={title:'User',items:menuItems};
	callback(r);
}
module.exports.URI = "http://magnode.org/transform/Menu_typeUserMenu";
