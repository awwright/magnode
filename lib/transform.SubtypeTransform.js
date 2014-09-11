/** Copy an input to outputs, i.e. HTMLBody_PutFormComment to HTMLBody, with option to depend on (render) certain types.
* The first input listed in the domain will be copied to every item in the range
* Use this for every time we need to produce generic output as well as a specific one, i.e. use this for HTMLBody_Comment -> HTMLBody

Use-cases:
- Create a transform that generates an HTMLBody from an HTMLBody_Comment
- Create a transform that generates a Document from an DocumentCSS, or Document from DocumentSCSS
- Create a transform that generates a Function from a Function_AttachmentPost, also depending on UserSession (to do authentication)

e.g. Transform:Document_typeDocumentHTML
	a view:SubtypeTransform, view:Transform, view:GetTransform ;
	view:domain type:DocumentHTML ;
	view:range type:Document .
*/

module.exports = function SubtypeTransform(db, transform, resources, render, callback){
	var domainCollection = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var domain = db.getCollection(doaminFirst)[0].toString();
	var range = db.match(transform,"http://magnode.org/view/range");
	var render = resources[domain[0]];
	var output = {};
	range.forEach(function(n){ output[n] = render; });
	callback(null, output);
}
module.exports.URI = 'http://magnode.org/view/SubtypeTransform';
