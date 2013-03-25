/*
e.g. Transform:HTMLBody_typeType
	a view:ModuleTransform, view:ViewTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB" ;
	view:domain type:ContentType ;
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

	//var result = '<pre class="form">'+escapeHTML(util.inspect(node))+'</pre>';
	//var output = {};
	//outputTypes.forEach(function(v){output[v]=result;});
	//callback(null, output);
	//return;

	resources['db-mongodb-schema'].findOne({subject:resourcesTypes[0]}, function(err, typeDoc){
		if(!node.subject) node.subject=node.resource;
		var schema = typeDoc&&typeDoc.schema||{};
		typeDocId = typeDoc.subject||typeDoc._id;
		var fieldType = 'http://magnode.org/field/object';
		var input = Object.create(resources.requestenv);
		input[fieldType] = {};
		for(var n in schema) input[fieldType][n] = schema[n];
		input[fieldType].name = '';
		input[fieldType].value = node;
		var transformTypes = ['http://magnode.org/view/ViewTransform'];
		render.render(targetType, input, transformTypes, haveRenderedForm);
	});

	function haveRenderedForm(err, res){
		if(err) return void callback(err);
		var form = (res && res[targetType])?res[targetType]:escapeHTML(util.inspect(node));
		
		result = '<div class="form">' + form + '</div>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
}
