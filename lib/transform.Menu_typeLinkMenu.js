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

	var userAuth = Object.create(input);
	// Emulate permissions of submitting a form
	userAuth.auth_token = input['http://magnode.org/UserSession'] && input['http://magnode.org/UserSession'].formToken;
	input.authz.test(userAuth, ['get','displayLinkMenu'], input, function(authorized){ if(authorized===true){
		renderMenu();
	}else{
		var r = {};
		//outputTypes.forEach(function(v){ r[v]={title:'UNAUTHORIZED',items:[]}; });
		callback(new Error('No permission'));
	}});

	function renderMenu(){
		var srcdb = input['db-mongodb-linkmenuitem'];
		var query = {top: menu.subject||''};
		var menuItems = [];
		srcdb.find(query).each(function(err, item){
			if(err) return void rsEnd(err);
			else if(!item) return void rsEnd();

			menuItems.push({href:item.href, value:item.label, weight:item.weight, src:item});
		});
		function rsEnd(err){
			menuItems.sort(function(a,b){return (a.weight||0)-(b.weight||0);});
			var r = {};
			outputTypes.forEach(function(v){ r[v]={title:menu.label||'Menu',items:menuItems}; });
			callback(null, r);
		}
	}
}
module.exports.URI = "http://magnode.org/transform/Menu_typeDocument";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:Core']
	, 'view:domain': {$list:['type:LinkMenu']}
	, 'view:range': ['type:Menu']
	};
