/*
Generate a menu with View/Edit/New/List/etc links to the different formats of the resource
*/

var rdfenv = require('rdf').environment;

module.exports = function(db, transform, input, render, callback){
	var authz = input.authz;
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	// Note these are specified as HTML
	var items = input['http://magnode.org/ResourceMenu'] || [];
	var li = [];
	function nextItem(i){
		var item = items[i];
		if(!item) return finished();
		// Emulate permissions of submitting a form
		var userAuth = Object.create(input);
		userAuth.auth_token = input['http://magnode.org/UserSession'] && input['http://magnode.org/UserSession'].formToken;
		authz.test(userAuth, item.action||'get', input, function(granted){
			if(granted===true){
				li.push('<li><a href="'+item.href+'">'+item.title+'</a></li>');
			}
			nextItem(i+1);
		});
	}
	function finished(){
		var menu = li.length?('<div class="pagination"><h5>Formats</h5><ul>'+li.join('')+'</ul></div>'):'';
		var r = {};
		for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
		callback(null, r);
	}
	nextItem(0);
}
module.exports.URI = "http://magnode.org/transform/HTMLBodyBlockResourceMenu_typeResourceMenu";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:ResourceMenu', 'type:UserSession']}
	, 'view:range': ['type:HTMLBodyBlock_ResourceMenu', rdfenv.createLiteral('view:render')]
	};

module.exports.getDefault = function(){
	return [{title:'View',href:'?',action:'get'}, {title:'Edit',href:'?edit',action:'edit'}, {title:'Delete',href:'?delete',action:'edit'}];
}
