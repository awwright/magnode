/*
Generate a menu with View/Edit/New/List/etc links to the different formats of the resource
*/

var rdfenv = require('rdf').environment;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri=require('./relativeuri');

module.exports = function(db, transform, input, render, callback){
	var authz = input.authz;
	var rdf = input.rdf;
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	// Note these are specified as HTML
	var items = input['http://magnode.org/ResourceMenu'] || [];
	var li = [];
	function nextItem(i){
		var item = items[i];
		if(!item) return void finished();
		// Emulate permissions of submitting a form
		var userAuth = Object.create(input);
		userAuth.auth_token = input['http://magnode.org/UserSession'] && input['http://magnode.org/UserSession'].formToken;
		authz.test(userAuth, item.action||'get', input, function(granted){
			if(granted===true){
				li.push('<li><a href="'+escapeHTMLAttr(relativeuri(input.rdf, input.request.uri, item.href))+'">'+escapeHTML(item.title)+'</a></li>');
			}
			nextItem(i+1);
		});
	}
	function finished(){
		var menu = li.length?('<div class="variants"><h5>Formats</h5><ul>'+li.join('')+'</ul></div>'):'';
		var r = {};
		for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
		callback(null, r);
	}
	nextItem(0);
}
module.exports.URI = "http://magnode.org/transform/HTMLBodyBlockResourceMenu_typeResourceMenu";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:Core']
	, 'view:domain': {$list:['type:ResourceMenu', 'type:UserSession']}
	, 'view:range': ['type:HTMLBodyBlock_ResourceMenu', rdfenv.createLiteral('view:render')]
	};

module.exports.getDefault = function(){
	return [{title:'View',href:'?',action:'get'}, {title:'Edit',href:'?edit',action:'edit'}, {title:'Delete',href:'?delete',action:'edit'}];
}
