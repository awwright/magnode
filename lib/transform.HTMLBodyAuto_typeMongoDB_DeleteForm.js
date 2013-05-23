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

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var resourcesResource = resources[resourcesTypes[0]];
	var node = resources.node;

	var title = node&&node.label || node&&node.subject || resources.resource;

	var action = url.parse(resources.request.url, true);
	delete(action.query.delete);
	delete(action.search);
	var returnURL = url.format(action);
	action.query.method = 'delete';
	var actionURL = url.format(action);
	//action.query.apply = ['http://magnode.org/transform/Post-form-urlencoded',templateInverse[0]];

	result =
		'<form action="'+escapeHTMLAttr(actionURL)+'" method="post">'
		+ '<p>Are you sure you wish to delete <i>'+escapeHTMLAttr(title)+'</i>?</p>'
		+ '<p>This document may still be recoverable from the database, depending on revisioning settings.</p>'
		+ '<input type="hidden" name="_id" value="'+escapeHTMLAttr(node._id||"")+'"/>'
		+ '<input type="hidden" name="_method" value="DELETE"/>'
		+ '<input type="hidden" name="_etag" value="'+escapeHTMLAttr(node._etag||"")+'"/>'
		+ '<input type="hidden" name="_auth" value="'+escapeHTMLAttr((resources['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>'
		+ '<input type="submit" value="Delete"/>'
		+ '&nbsp;&nbsp;or&nbsp;&nbsp;<a href="'+escapeHTMLAttr(returnURL)+'">Cancel</a>'
		+ '</form>';
	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
	callback(null, output);
}
