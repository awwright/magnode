/*
e.g. Transform:HTMLBodyAuto_typeType_Form
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Form" ;
	view:domain ( type:Type type:UserSession ) ;
	view:range type:HTMLBody .
*/
var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	//var templateInverse = db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;});
	var resourcesResource = resources[resourcesTypes[0]];
	var fields = [];
	var tail = [];
	var node = resources.node;
	var targetType = 'http://magnode.org/HTMLBodyField';
	var typeDocId;

	resources['db-mongodb-schema'].findOne({subject:resourcesTypes[0]}, function(err, typeDoc){
		if(!node.subject) node.subject=node.resource;
		var schema = typeDoc&&typeDoc.schema||{};
		typeDocId = typeDoc.subject||typeDoc._id;
		var fieldType = 'http://magnode.org/field/object';
		var input = Object.create(resources);
		for(var f in resources) input[f]=resources[f];
		input[fieldType] = {};
		for(var n in schema) input[fieldType][n] = schema[n];
		input[fieldType].name = '';
		input[fieldType].value = node;
		var transformTypes = ['http://magnode.org/view/FormTransform'];
		render.render(targetType, input, transformTypes, haveRenderedForm);
	});

	function haveRenderedForm(err, res){
		if(err) return void callback(err);
		var form = (res && res[targetType])?res[targetType]:escapeHTML(util.inspect(node));

		var action = url.parse(resources.request.url, true);
		delete(action.search);
		delete(action.query.new);
		delete(action.query.edit);
		//action.query.apply = ['http://magnode.org/transform/Post-form-urlencoded',templateInverse[0]];

		result =
			'<form action="'+escapeHTMLAttr(url.format(action))+'" method="post">'
			+ form
			+ '<input type="hidden" name="_id" value="'+escapeHTMLAttr(node._id||"")+'"/>'
			+ '<input type="hidden" name="_method" value="'+(resources.createNew?'POST':'PUT')+'"/>'
			+ '<input type="hidden" name="_etag" value="'+escapeHTMLAttr(node._etag||"")+'"/>'
			+ '<input type="hidden" name="_type" value="'+escapeHTMLAttr(typeDocId||"")+'"/>'
			+ '<input type="hidden" name="_auth" value="'+escapeHTMLAttr((resources['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>'
			+ '<input type="submit" value="Submit"/>'
			+ '</form>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		output['http://magnode.org/ResourceMenu'] = require('./transform.HTMLBodyBlock_ResourceMenu').getDefault();
		callback(null, output);
	}
}
