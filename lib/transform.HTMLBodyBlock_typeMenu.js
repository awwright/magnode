/*
e.g. Transform:HTMLBody_Block_MainMenu_typeMenu_MainMenu
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:module "magnode/transform.HTMLBodyBlock_typeMenu.js" ;
	view:domain type:Menu_MainMenu ;
	view:range type:HTMLBody_Block_MainMenu .
*/

var shrinkURL = require('./relativeuri');

module.exports = function(db, transform, input, render, callback){
	var inputIdFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var inputId = db.getCollection(inputIdFirst);
	if(inputId.length!==1) throw new Error('Transform <'+transform+'> needs exactly one domain argument');
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var menuItems = input[inputId];
	var li = [];
	for(var i=0; i<menuItems.items.length; i++){
		li.push('<li><a href="'+shrinkURL(input.rdf, menuItems.items[i].href)+'">'+menuItems.items[i].value+'</a></li>');
	}
	var menu = '<div class="menu"><h5>'+(menuItems.title||'Menu')+'</h5><ul>'+li.join('')+'</ul></div>';
	var r = {};
	for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
	callback(r);
}
module.exports.URI = "http://magnode.org/transform/HTMLBodyBlock_typeMenu";
