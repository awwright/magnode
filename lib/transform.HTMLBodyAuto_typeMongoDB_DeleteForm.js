/*
e.g. Transform:HTMLBodyAuto_typeType_Form
	a view:ModuleTransform, view:DeleteFormTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB_DeleteForm" ;
	view:domain ( type:Type type:UserSession ) ;
	view:range type:HTMLBody .
*/
var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeURI=require('./relativeuri');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var node = resources[resourcesTypes[0]];
	var title = node&&node.label || node&&node.subject || resources.variant.resource;
	// FIXME read schema from the database or wherever it's being provided to us...
	//var docEtag = node[schema.etagField] && (node[schema.etagField]+'');
	var action = Object.create(resources.variant);
	action.requiredTypes = ['http://magnode.org/HTTPResponse_PutFn'];
	var result =
		'<form action="'+escapeHTMLAttr(relativeURI(resources.rdf, action.toURI()))+'" method="post">'
		+ '<p>Are you sure you wish to delete <i>'+escapeHTMLAttr(title)+'</i>?</p>'
		+ '<p>This document may still be recoverable from the database, depending on revisioning settings.</p>'
		+ '<input type="hidden" name=":method" value="DELETE"/>'
		+ '<input type="hidden" name=":_id" value="'+escapeHTMLAttr(node._id||"")+'"/>'
		+ '<input type="hidden" name=":if-match" value="'+escapeHTMLAttr(node._etag||"")+'"/>'
		+ '<input type="hidden" name=":auth" value="'+escapeHTMLAttr((resources['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>'
		+ '<input type="submit" value="Delete"/>'
		// FIXME use padding instead of nonbreaking spaces
		+ '&#xA0;&#xA0;or&#xA0;&#xA0;<a href="'+escapeHTMLAttr(resources.variant.subject)+'">Cancel</a>'
		+ '</form>';
	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	output['http://magnode.org/DocumentTitle'] = 'Delete: ' + title;
	callback(null, output);
}
