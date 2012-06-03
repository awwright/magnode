/*
e.g. Transform:DocumentHTML_Body_Block_MainMenu_typeMenu_MainMenu
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:module "magnode/transform.DocumentHTML_BodyBlock_typeMenu.js" ;
	view:domain type:Menu_MainMenu ;
	view:range type:DocumentHTML_Body_Block_MainMenu .
*/

module.exports = function(db, transform, input, render, callback){
	var inputId = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	if(inputId.length!==1) throw new Error('Transform <'+transform+'> needs exactly one domain argument');
	var outTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var menuItems = input[inputId];
	//var menuItems = [ {href:"/",value:"Main Menu"} ];
	var li = [];
	for(var i=0; i<menuItems.length; i++){
		li.push('<li><a href="'+menuItems[i].href+'">'+menuItems[i].value+'</a></li>');
	}
	var menu = '<div class="menu"><h5>Menu</h5><ul>'+li.join('')+'</ul></div>';
	var r = {};
	for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
	callback(r);
}
module.exports.URI = "http://magnode.org/transform/DocumentHTML_BodyBlock_typeMenu";
