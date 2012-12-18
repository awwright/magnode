/*
Generate a menu with View/Edit/New/List/etc links to the different formats of the resource
*/

module.exports = function(db, transform, input, render, callback){
	var authz = input.authz;
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	// Note these are specified as HTML
	var items = [{title:'View',href:'?',action:'get'},{title:'Edit',href:'?edit',actions:'edit'}];
	var li = [];
	function nextItem(i){
		var item = items[i];
		if(!item) return finished();
		authz.test(null, item.action, input, function(granted){
			if(granted){
				li.push('<li><a href="'+item.href+'">'+item.title+'</a></li>');
			}
			nextItem(i+1);
		});
	}
	function finished(){
		var menu = li.length?('<div class="pagination"><h5>Formats</h5><ul>'+li.join('')+'</ul></div>'):'';
		var r = {};
		for(var i=0; i<outTypes.length; i++) r[outTypes[i]]=menu;
		callback(r);
	}
	nextItem(0);
}
module.exports.URI = "http://magnode.org/transform/HTMLBodyBlockResourceMenu_typeNode";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:[]}
	, 'view:range': ['type:HTMLBodyBlock_ResourceMenu']
	};