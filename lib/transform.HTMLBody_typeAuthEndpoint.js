var util=require("util");
var querystring = require('querystring');

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri = require('./relativeuri');
var readRequestBody = require('./requestbody').readRequestBody;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/AuthEndpoint"];
	var credentials = input.credentials;
	var body = '<h1>AuthEndpoint</h1>'
		+ '<form action="" method="post">'
		+ '<dl>'
		+ '<dt>Username</dt><dd><input type="text" name="username" value=""/></dd>'
		+ '<dt>Password</dt><dd><input type="password" name="password" value=""/></dd>'
		+ '</dl>'
		+ '<input type="hidden" name="realm" value="'+escapeHTML(input.variant.resource)+'"/>'
		+ '<input type="hidden" name="redirect" value="/"/>'
		+ '<input type="hidden" name="issue" value="cookie"/>'
		+ '<input type="submit" value="Login"/>'
		+ '</form>';

	var process = function(db, transform, resources, render, callback){
		var response = resources.response;
		var data;
		readRequestBody(resources.request, 1000, function haveData(err, body){
			data = querystring.parse(body);
			credentials.authenticateCredential(data, haveUser);
		});
		function haveUser(err, user){
			if(user){
				response.statusCode = 303;
				response.setHeader("Location", relativeuri(resources.rdf, resources.request.uri, data.redirect));
				response.setHeader("Set-Cookie", self.createSession(user.id));
			}else{
				response.statusCode = 403;
				response.write("403 Forbidden\n\nAccess Denied.\n");
			}
			response.end();
		}
	};

	callback(null, {
		"http://magnode.org/HTMLBody": body,
		"http://magnode.org/Function": process,
	});
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeAuthEndpoint";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform', 'view:Core']
	, 'view:domain': {$list:['type:AuthEndpoint']}
	, 'view:range': ['type:HTMLBody', 'type:Function']
	};
