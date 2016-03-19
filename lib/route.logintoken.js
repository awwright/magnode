/*
HTML-form based authentication functionality
*/

var querystring = require('querystring');
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var escapeHTML = require('./htmlutils').escapeHTML;

module.exports = function form(config, sessionStore){
	this.config = config;
	this.sessionStore = sessionStore;
}

/*
Provide a form for a user to specify a credential with
*/
module.exports.prototype.routeForm = function(router, resources, render, path){
	var sessionStore = this.sessionStore;
	function routeForm(resource, callback){
		if(resource.substring(0,path.length)!==path) return void callback();
		if(resource[path.length]=='/'){
			var token = resource.substring(path.length+1);
		}else{
			var params = resource.indexOf('?');
			params = (params>=0) ? resource.substring(params+1) : '';
			params = querystring.parse(params, '&');
			var token = params.access_token || '';
		}
		sessionStore.authenticateToken(token, function(err, session){
			if(err || !session) return void callback(err);
			var arguments = {}
			if(session) arguments['http://magnode.org/LoginToken'] = session;
			arguments['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
			arguments['http://magnode.org/DocumentTitle'] = 'Login';
			arguments['authorized'] = true;
			callback(null, arguments);
		});
	}
	router.push(routeForm);
}
