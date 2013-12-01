var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	// This will only have valid session tokens, invalid tokens would be a 404 or 401
	var session = input["http://magnode.org/LoginToken"];
	if(!session || !session.id) return void callback(new Error('Invalid value for LoginToken'));
	// FIXME this route needs to not be hard-coded
	var contents = '<form action="/createSession.token" method="post">'
		+ '<p>This is a one-time login for '+escapeHTML(session.id)+' and will expire on '+(session.expires)+'.</p>'
		+ '<p>Click on this button to log in to the site and change your password.</p>'
		+ '<p>This login can be used only once.</p>'
		+ '<input type="hidden" name="access_token" value="'+escapeHTMLAttr(session.token)+'"/>'
		+ '<input type="hidden" name="redirect" value="/?from=token"/>'
		+ '<input type="submit" value="Login"/>'
		+ '</form>';
	callback(null, {"http://magnode.org/HTMLBody": contents});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeLoginToken";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform']
	, 'view:domain': {$list:['type:LoginToken']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
