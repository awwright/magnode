/*
Transform:AuthHTTPForm_New
	a view:ModuleTransform ;
	view:module "transform.AuthHTTPForm_New"
	view:range type:AuthHTTPForm_Instance ;
	view:domain type:AuthHTTPForm .
*/
module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/AuthHTTPForm'];

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/domain'});
	if(!q[0] || !q[0].object){
		throw new Error('No domain found for '+subject);
		return false;
	}
	var domain = q[0].object.toString();

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/action'});
	if(!q[0] || !q[0].object){
		throw new Error('No action found for '+subject);
		return false;
	}
	var action = q[0].object.toString();

	var q = input.db.filter({subject:subject,predicate:'http://magnode.org/credentials'});
	if(!q[0] || !q[0].object){
		throw new Error('No credential source found for '+subject);
		return false;
	}
	var credentials = q[0].object;

	var resources = { db: input.db };
	var resourceTypes = db.filter({subject:credentials, predicate:"rdf:type"}).map(function(v){return v.object});
	for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=credentials;

	var router = render.render('http://magnode.org/AuthPassword_Instance', resources, [], function(r){
		if(!r) throw new Error('Password authenticator for '+subject+' could not be created');
		var authHTTPForm = new (require("magnode/authentication.form"))(
			{ domain: domain
			, action: action
			, credentials: r['http://magnode.org/AuthPassword_Instance']
			} );
		callback({"http://magnode.org/AuthHTTPForm_Instance":authHTTPForm, "http://magnode.org/AuthHTTP_Instance":authHTTPForm});
	})


}
module.exports.URI = "http://magnode.org/transform/AuthHTTPForm_New";
