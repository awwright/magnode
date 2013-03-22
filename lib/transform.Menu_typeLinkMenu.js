/*
Generates a list of menu items from documents with attached "menu" properties in the database.

TODO: Not all document types will define menu items the same way
FIXME: This queries multiple documents every time it's requested. This needs to be cached in some way.
*/

var querystring = require('querystring');

module.exports = function(db, transform, input, render, callback){
	var inputIdFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var inputId = db.getCollection(inputIdFirst);
	if(inputId.length!==1) throw new Error('Transform <'+transform+'> needs exactly one domain argument');
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var menu = input[inputId[0]];

	input.authz.test(null, ['get','displayLinkMenu'], input, function(authorized){if(authorized===true){
		renderMenu();
	}else{
		var r = {};
		//outputTypes.forEach(function(v){ r[v]={title:'UNAUTHORIZED',items:[]}; });
		callback(new Error('No permission'));
	}});

	function renderMenu(){
		var menuId = menu.subject||'';
		var escapedMenuId = menuId.replace(/%/g,'%25').replace(/\x2E/g, '%2E').replace(/\x24/g, '%24');
		var query = {"menu":{$exists:true}};
		if(Array.isArray(menu.scan)) query.type={$in:menu.scan};
		var menuItems = [];
		var srcdb = input['db-mongodb'];
		srcdb.find(query, {_id:1,subject:1,label:1,menu:1}).forEach(
		function(node){
			if(!node.subject || !node.menu) return;
			var item = node.menu[menuId] || node.menu[escapedMenuId];
			if(!item) return;
			var href = node.subject;
			if(item.arguments){
				href += '?'+querystring.stringify(arguments,';');
			}
			menuItems.push({href:href, value:item.title||node.label, weight:item.weight, src:node});
		},
		function(err){
			menuItems.sort(function(a,b){return (a.weight||0)-(b.weight||0);});
			var r = {};
			outputTypes.forEach(function(v){ r[v]={title:menu.label||'Menu',items:menuItems}; });
			callback(null, r);
		});
	}
}
module.exports.URI = "http://magnode.org/transform/Menu_typeDocument";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:LinkMenu']}
	, 'view:range': ['type:Menu']
	};
