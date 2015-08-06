/*
HTML-form based authentication functionality
*/

var querystring = require('querystring');

var relativeuri = require('./relativeuri');
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function FormAuthentication(config, authz){
	this.config = config;
	this.credentials = config.credentials;
	this.action = config.action;
	this.authz = authz;
}

module.exports.prototype.test = function formTest(user, actions, resources, callback){
	if(!user) user=resources;
	var request = resources.request;
	if(!request || !request.routeForm) return void callback(false);
	var authz = this.authz;
	this.authenticateRequest(resources, function(err, info){
		if(err) return void callback(false);
		if(!auth) return void callback(false);
		var userAuth = Object.create(user);
		userAuth.authentication = info;
		// The authentication data is authentic, now defer to the chain
		authz.test(userAuth, actions, resources, callback);
	});
}

/*
Authenticate a posted credential
FIXME: This may never return if the form data has already been processed
*/
var readRequestBody = require('./requestbody').readRequestBody;
module.exports.prototype.authenticateRequest = function authenticateRequest(resources, callback){
	var credentials = this.credentials;
	readRequestBody(resources.request, 1000, function haveData(err, body){
		var data = querystring.parse(body);
		credentials.authenticateCredential(data, callback);
	});
}
