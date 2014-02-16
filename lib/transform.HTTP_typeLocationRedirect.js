
// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function HTMLBody_typeMarkdown(db, transform, resources, render, callback){
	var uriref = resources['http://magnode.org/LocationRedirect'];
	resources.response.statusCode = 303;
	resources.response.setHeader('Location', uriref);
	resources.response.setHeader('Content-Type', 'text/plain');
	// TODO add an HTML meta redirect here too?
	resources.response.end('Location: '+uriref);
	var output = {'http://magnode.org/HTTPResponse':303};
	callback(null, output);
}
module.exports.URI = "http://magnode.org/transform/HTTP_typeLocationRedirect";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:PutFormTransform', 'view:DeleteFormTransform']
	, 'view:domain': {$list:['http://magnode.org/LocationRedirect']}
	, 'view:range': ['http://magnode.org/HTTPResponse']
	};
