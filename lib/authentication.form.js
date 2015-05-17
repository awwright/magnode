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

/*
Provide a form for a user to specify a credential with
*/
module.exports.prototype.routeForm = function routeForm(router, resources, render, path){
	var self=this;
	router.push(path, function(request, response, resources, render){
		var action = relativeuri(resources.rdf, request.uri, self.action||"/login");

		var contents = '<form action="'+escapeHTMLAttr(action)+'" method="post">'
			//+ '<input type="hidden" name="realm" value=""/>'
			//+ '<input type="hidden" name="return" value=""/>'
			+ '<dl>'
			+ '<dt>Username</dt><dd><input type="text" name="username" value=""/></dd>'
			+ '<dt>Password</dt><dd><input type="password" name="password" value=""/></dd>'
			+ '</dl>'
			+ '<input type="submit" value="Login"/>'
			+ '</form>';
		var args = {};
		args['http://magnode.org/HTMLBody'] = contents;
		args['http://magnode.org/HTMLBodyLoginform'] = contents;
		args['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
		args['http://magnode.org/DocumentTitle'] = 'Login';
		args['authorized'] = true;
		render(null, args);
	} );
}


module.exports.generate =
	{ "@id":"http://magnode.org/transform/AuthHTTPForm_New"
	, domain:"http://magnode.org/AuthHTTPForm"
	, range:["http://magnode.org/AuthHTTPForm_Instance","http://magnode.org/AuthHTTP_Instance"]
	, arguments:
		[ {type:"http://magnode.org/AuthPassword_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/credentials",object:"$result"}]}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/domain",object:"$result"}, default:null}
		, {type:"literal", value:{subject:"$subject",predicate:"http://magnode.org/action",object:"$result"}, default:null}
		]
	, construct: function(credentials, domain, action){ return new module.exports({domain:domain.toString(), action:action.toString(), credentials:credentials}); }
	};
