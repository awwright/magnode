/*
Transform:AuthHTTPCookie_New
	a view:ModuleTransform, view:NewServiceTransform ;
	view:module "magnode/transform.AuthHTTPCookie_New" ;
	view:domain type:AuthHTTPCookie ;
	view:range type:AuthHTTPCookie_Instance, type:AuthHTTP_Instance .
*/
var crypto = require('crypto');
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/AuthHTTPCookie'];

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/domain'});
	if(!q[0] || !q[0].object){
		throw new Error('No domain found for '+subject);
		return false;
	}
	var domain = q[0].object;

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/expires'});
	if(!q[0] || !q[0].object){
		throw new Error('No expires found for '+subject);
		return false;
	}
	var expires = q[0].object;

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/secret'});
	if(!q[0] || !q[0].object){
		throw new Error('No secret key found for '+subject);
		return false;
	}
	var secret = q[0].object;
	var secret = crypto.randomBytes(256); // Math.random is not cryptographically secure!
	var authHTTPCookie = new (require("magnode/authentication.cookie"))(
		{ domain: "/"
		, redirect: "/?from=login"
		, expires: 1000*60*60*24*14
		, secret: secret
		} );
	callback({"http://magnode.org/AuthHTTPCookie_Instance":authHTTPCookie, "http://magnode.org/AuthHTTP_Instance":authHTTPCookie});
}
module.exports.URI = "http://magnode.org/transform/AuthHTTPCookie_New";
