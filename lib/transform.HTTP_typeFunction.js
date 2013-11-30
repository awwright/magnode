var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

// Execute some provided function as a script, which will write the HTTP response by itself
module.exports = function(db, transform, resources, render, callback){
	var script = resources["http://magnode.org/Function"];
	script(db, transform, resources, render, callback);
}
module.exports.URI = "http://magnode.org/transform/HTTP_typeFunction";
module.exports.about =
	{ a: ['view:Transform', 'view:PostTransform']
	, 'view:domain': {$list:['type:Function']}
	, 'view:range': ['type:HTTPResponse']
	};
