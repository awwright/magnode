var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/AuthEndpoint"];
	var body = '<h1>AuthEndpoint</h1>'
		+ '<form action="" method="post">'
		//+ '<input type="hidden" name="realm" value=""/>'
		//+ '<input type="hidden" name="return" value=""/>'
		+ '<dl>'
		+ '<dt>Username</dt><dd><input type="text" name="username" value=""/></dd>'
		+ '<dt>Password</dt><dd><input type="password" name="password" value=""/></dd>'
		+ '</dl>'
		+ '<input type="submit" value="Login"/>'
		+ '</form>';
	var process = function(db, transform, resources, render, callback){
		var req = resources.request;
		var res = resources.response;
	}
	callback(null, {
		"http://magnode.org/HTMLBody": body,
		"http://magnode.org/Function": process,
	});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeAuthEndpoint";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform', 'view:Core']
	, 'view:domain': {$list:['type:AuthEndpoint']}
	, 'view:range': ['type:HTMLBody']
	};
