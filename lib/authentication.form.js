/*
HTML-form based authentication functionality
*/

var credential = require('magnode/credential');
var querystring = require('querystring');

module.exports = function(config){
	this.config = config;
	this.credentials = config.credentials;
}

/*
Authenticate a posted credential
*/
module.exports.prototype.authenticateRequest = function(request, callback){
	var postdata = '';
	var self=this;
	request.addListener('data', function(data){
		if(data.length>1000) return;
		postdata += data;
	} );
	request.addListener('end', function(){
		var data = querystring.parse(postdata);
		self.credentials.authenticateCredential({username:data.username,password:data.password}, callback);
	} );
	
}

/*
Provide a form for a user to specify a credential with
*/
module.exports.prototype.routeForm = function(router, render, path){
	var self=this;
	router.push(path, function(request, response){
		function escapeHTML(v){return v.replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
		var action = self.config.action||"/login";
		var contents = '<form action="'+escapeHTML(action)+'" method="post">'
			//+ '<input type="hidden" name="realm" value=""/>'
			//+ '<input type="hidden" name="return" value=""/>'
			+ '<dl>'
			+ '<dt>Username</dt><dd><input type="text" name="username" value=""/></dd>'
			+ '<dt>Password</dt><dd><input type="password" name="password" value=""/></dd>'
			+ '</dl>'
			+ '<input type="submit" value="Login"/>'
			+ '</form>';

		var arguments = 
			{ db: self.config.db
			//, authz: authz
			, request: request
			, response: response
			, "http://magnode.org/DocumentHTML_Body": contents
			, "http://magnode.org/DocumentHTML_BodyLoginform": contents
			};
		render.render("http://magnode.org/HTTPResponse", arguments, function(formatted){
			console.log("Login form rendered");
			if(!formatted['http://magnode.org/HTTPResponse']){
				response.setHeader("Content-Type", "text/html");
				response.end("<html><body>"+contents+"</body></html>");
			}
		});
	} );
}
