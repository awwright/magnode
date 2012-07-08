/*
Generates a list of menu items for a user to manage their account (edit, view, logout, login, etc.)

e.g. Transform:Menu_typeUserSession
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:menuItemContentTypes type:Raw, type:Page ;
	view:module "magnode/transform.Menu_typeUserSession" ;
	view:domain type:UserSession .
	view:range type:Menu_UserSession .
*/

module.exports = function(db, transform, input, render, callback){
	var outTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var contentType = "http://magnode.org/UserSession";
	var auth = input[contentType];
	var menuItems = [];
	if(auth && auth.id){
		if(auth.username) menuItems.push({href:auth.id,value:auth.username});
		menuItems.push({href:auth.id+'?edit',value:"Preferences"});
		menuItems.push({href:"/?logout",value:"Log out"});
	}else{
		menuItems.push({href:"/login",value:"Log in"});
	}
	var r = {};
	for(var i=0; i<outTypes.length; i++) r[outTypes[i]]={title:'User',items:menuItems};
	callback(r);
}
module.exports.URI = "http://magnode.org/transform/Menu_typeUserSession";
