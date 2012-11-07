/*
HTML-form based authentication functionality
*/

var querystring = require('querystring');
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function(config){
	this.config = config;
	this.credentials = config.credentials;
	this.action = config.action;
	this.db = config.db;
}

/*
Authenticate a posted credential
FIXME: This never returns if the form data has already been processed
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
module.exports.prototype.routeForm = function(router, resources, render, path){
	var self=this;
	router.push(path, function(request, response){
		var action = self.action||"/login";
		var contents = '<form action="'+escapeHTMLAttr(action)+'" method="post">'
			//+ '<input type="hidden" name="realm" value=""/>'
			//+ '<input type="hidden" name="return" value=""/>'
			+ '<dl>'
			+ '<dt>Username</dt><dd><input type="text" name="username" value=""/></dd>'
			+ '<dt>Password</dt><dd><input type="password" name="password" value=""/></dd>'
			+ '</dl>'
			+ '<input type="submit" value="Login"/>'
			+ '</form>';
		var arguments = Object.create(resources);
		arguments.request = request;
		arguments.requestenv = arguments;
		arguments.response = response;
		arguments["http://magnode.org/HTMLBody"] = contents;
		arguments["http://magnode.org/HTMLBodyLoginform"] = contents;
		render.render("http://magnode.org/HTTPResponse", arguments, function(err, formatted){
			if(err){
				// If we didn't send an HTTP response, let's send one ourselves
				response.end("Processing error: "+(err.stack||err.toString()));
				return;
			}
			if(!formatted || !formatted['http://magnode.org/HTTPResponse']){
				// If we didn't send an HTTP response, let's send one ourselves
				response.setHeader("Content-Type", "text/html");
				response.end("<html><body>"+contents+"</body></html>");
			}
		});
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
