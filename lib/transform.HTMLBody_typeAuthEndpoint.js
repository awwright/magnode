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
		+ '<dt><label for="login_username">Username</label></dt><dd><input type="text" id="login_username" name="username" value=""/></dd>'
		+ '<dt><label for="login_password">Password</label></dt><dd><input type="password" id="login_password" name="password" value=""/></dd>'
		+ '<dt><label for="login_remember_me">Remember</label></dt><dd><input type="checkbox" id="login_remember_me" name="remember_me" value="1"/></dd>'
		+ '</dl>'
		+ '<input type="hidden" name="credential" value="password"/>'
		+ '<input type="hidden" name="realm" value="'+escapeHTML(input.variant.resource)+'"/>'
		+ '<input type="hidden" name="client_id" value="'+escapeHTML(input.variant.params['client_id']||'')+'"/>'
		+ '<input type="hidden" name="state" value="'+escapeHTML(input.variant.params['state']||'')+'"/>'
		+ '<input type="hidden" name="redirect_uri" value="'+escapeHTML(input.variant.params['redirect_uri']||'')+'"/>'
		+ '<input type="hidden" name="scope" value=""/>'
		+ '<input type="hidden" name="lang" value="en-US"/>'
		+ '<input type="submit" value="Login"/>'
		+ '</form>';

	var process = function(db, transform, resources, render, callback){
		// 1. Look up credential in credentials database with credential_id = HMAC(realm, normalize(username))
		// 2. Verify credential
		// 3. Look up user associated with credential
		// 4. Issue bearer token to user by cookie or similar
		var response = resources.response;
		var credentials = resources['http://magnode.org/CredentialStore'];
		var session = resources['http://magnode.org/SessionManager'];
		var data;
		readRequestBody(resources.request, 1000, function haveData(err, body){
			data = querystring.parse(body);
			credentials.authenticateCredential(data, haveUser);
		});
		function haveUser(err, user){
			var secure = true;
			var cookieExpires = doc.cookieExpires || 1000*60*60*24;
			var cookieName = 'authtoken';
			if(user){
				var token = session.createSession(user.id, cookieExpires);
				var maxAge = Math.round((token.expires.valueOf()-new Date().valueOf())/1000);
				var header = cookieName+"="+token.secret.replace(/=/g,'')+"; expires="+token.expires.toUTCString()+"; max-age="+maxAge+"; path=/";
				if(doc.secure) header += '; secure';
				response.statusCode = 303;
				var location;
				if(data.client_id){
					location = data.redirect_uri + '?code=' + new Date().valueOf() + '&state=' + encodeURIComponent(data.state||'');
				}else if(data.redirect_uri){
					location = relativeuri(resources.rdf, resources.request.uri, data.redirect_uri);
				}else{
					// TODO if no redirect_uri specified, default to namespace base
					location = '/';
				}
				response.setHeader("Location", location);
				response.setHeader("Set-Cookie", header);
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
	, 'view:domain': {$list:['http://magnode.org/AuthEndpoint', 'http://magnode.org/CredentialStore']}
	, 'view:range': ['http://magnode.org/HTMLBody', 'http://magnode.org/Function']
	};
