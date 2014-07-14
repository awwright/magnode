/*
e.g. Transform:HTMLBody_typeType
	a view:ModuleTransform, view:GetTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB" ;
	view:domain type:ContentType ;
	view:range type:HTMLBody .
*/
var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeuri = require('./relativeuri');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	//var templateInverse = db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;});
	var node = resources[resourcesTypes[0]];
	var fields = [];
	var tail = [];
	var targetType = 'http://magnode.org/HTMLBodyField';
	var typeDocId;

	//var result = '<pre class="form">'+escapeHTML(util.inspect(node))+'</pre>';
	//var output = {};
	//outputTypes.forEach(function(v){output[v]=result;});
	//callback(null, output);
	//return;

	var schemaQuery = {id:resourcesTypes[0].toString()};
	resources['db-mongodb-schema'].findOne(schemaQuery, function(err, typeDoc){
		if(err) return void callback(err);
		if(!typeDoc) return void callback(new Error('Schema <'+schemaQuery.id+'> not found'));
		if(!node.subject) node.subject=node.resource;
		var schema = typeDoc&&typeDoc.schema||{};
		typeDocId = typeDoc.subject||typeDoc._id;
		var fieldType = 'http://magnode.org/field/object';
		var input = Object.create(resources.requestenv);
		input.createNew = resources.createNew;
		input[fieldType] = {};
		for(var n in schema) input[fieldType][n] = schema[n];
		input[fieldType].name = '';
		input[fieldType].value = node;
		var transformTypes = ['http://magnode.org/view/GetTransform'];
		render.render(targetType, input, transformTypes, haveRenderedForm);
	});

	function haveRenderedForm(err, res){
		if(err) return void callback(err);
		var form = (res && res[targetType])?res[targetType]:escapeHTML(util.inspect(node));

		var title = node.label || node.subject || node._id || '';
		if(title){
			title = escapeHTML(title);
			var href = node && (node.id || node.subject);
			if(href) title = '<a href="'+escapeHTMLAttr(relativeuri(resources.rdf, href))+'">'+title+'</a>';
			title = '<h2>'+title+'</h2>';
		}

		result = '<div class="form">' + title + form + '</div>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
}
