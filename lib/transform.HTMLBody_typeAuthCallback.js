var util=require("util");
var http = require('https');
var querystring = require('querystring');

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;
var relativeuri = require('./relativeuri');
var readRequestBody = require('./requestbody').readRequestBody;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/AuthCallback"];
	var res = input.response;
	var credentials = input.credentials;
	var body = '';

	// If passed a "code" parameter, then process the code and log the user in
	if(input.variant.params.code){
		// Blarg, TODO
		//http.request({});
		res.statusCode = 302;
		res.setHeader('Location', '/?from=login');
		res.setHeader('Set-Cookie', 'login=success');
	}else{
		// If no code, redirect user to remote endpoint so we can get their info
		res.statusCode = 302;
		// FIXME tie `state` to session or something
		var location = doc.endpoint+'?app_id='+doc.client_id+'&redirect_uri='+doc.subject+'&state='+Math.random().toString().substring(2);
		res.setHeader('Location', location);
	}
	res.end();

	callback(null, {
		"http://magnode.org/HTTPResponse": 302,
	});
}
module.exports.URI = "http://magnode.org/transform/HTTPResponse_typeAuthCallback";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform', 'view:Core']
	, 'view:domain': {$list:['http://magnode.org/AuthCallback', 'http://magnode.org/CredentialStore']}
	, 'view:range': ['http://magnode.org/HTTPResponse', 'media:*/*', 'media:application/xhtml+xml;charset=utf-8']
	, 'view:nice': -1
	};
