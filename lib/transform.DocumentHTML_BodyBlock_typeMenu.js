/*
e.g. Transform:DocumentHTML_Body_Block_MainMenu_typeMenu_MainMenu
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:module "magnode/transform.DocumentHTML_BodyBlock_typeMenu.js" ;
	view:domain type:Menu_MainMenu ;
	view:range type:DocumentHTML_Body_Block_MainMenu .
*/

var url = require('url');

/** Rewrite a resource URL to be relative to the base
 * Even rewrite external URLs to use internal URLs with the appropriate prefix e.g. http://magnode.org/rdfs:Class
 */
function shrinkURL(input, href){
	if(input.rdf){
		var base = input.rdf.prefixes[''];
		// See if we can strip out just the domain name from the input href
		var baseparts = url.parse(base, undefined, true);
		var prefix = baseparts.protocol+'//'+baseparts.host;
		if(href.substr(0,prefix.length)===prefix) return href.substr(prefix.length);
		// Or see if there's some shortened form we can reduce to
		for(var p in input.rdf.prefixes){
			var prefix = input.rdf.prefixes[p];
			if(href.substr(0,prefix.length)===prefix) return base+p+':'+href.substr(prefix.length);
		}
	}
	return href;
}

module.exports = function(db, transform, input, render, callback){
	var inputId = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	if(inputId.length!==1) throw new Error('Transform <'+transform+'> needs exactly one domain argument');
	var outTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var menuItems = input[inputId];
	var li = [];
	for(var i=0; i<menuItems.items.length; i++){
		li.push('<li><a href="'+shrinkURL(input, menuItems.items[i].href)+'">'+menuItems.items[i].value+'</a></li>');
	}
	var menu = '<div class="menu"><h5>'+(menuItems.title||'Menu')+'</h5><ul>'+li.join('')+'</ul></div>';
	var r = {};
	for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
	callback(r);
}
module.exports.URI = "http://magnode.org/transform/DocumentHTML_BodyBlock_typeMenu";
