/*
Generates a list of menu items for a user to manage their account (edit, view, logout, login, etc.)

e.g. Transform:Menu_typeUserSession
	a view:Transform, view:ModuleTransform, view:FormTransform, view:DeleteFormTransform, view:ViewTransform ;
	view:menuItemContentTypes type:Raw, type:Page ;
	view:module "magnode/transform.Menu_typeUserSession" ;
	view:domain type:UserSession .
	view:range type:Menu_UserSession .
*/

module.exports = function(db, transform, input, render, callback){
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var contentType = "http://magnode.org/UserSession";
	var auth = input[contentType];
	var menu = {title:'User',items:[]};
	if(auth && auth.id){
		if(auth.username) menu.items.push({href:auth.id,value:auth.username});
		menu.items.push({href:auth.id+'?edit',value:"Preferences"});
		menu.items.push({href:"/?logout",value:"Log out"});
	}else{
		menu.items.push({href:"/login",value:"Log in"});
	}
	var r = {};
	outTypes.forEach(function(v){ r[v]=menu; });
	callback(null, r);
}
module.exports.URI = "http://magnode.org/transform/Menu_typeUserSession";
