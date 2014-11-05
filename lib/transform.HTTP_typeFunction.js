var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

// Execute some provided function as a script, which will write the HTTP response by itself
module.exports = function HTTP_typeFunction_Get(db, transform, resources, render, callback){
	var script = resources["http://magnode.org/Function"];
	var res = resources.response;
	res.setHeader('Content-Type', 'text/plain');
	res.end('[Function '+script.name+']\n');
}
module.exports.URI = "http://magnode.org/transform/HTTP_typeFunction";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:Core']
	, 'view:domain': {$list:['type:Function']}
	, 'view:range': ['type:HTTPResponse']
	};
