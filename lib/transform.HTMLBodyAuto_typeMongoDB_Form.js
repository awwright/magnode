/*
e.g. Transform:HTMLBodyAuto_typeType_Form
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Form" ;
	view:domain type:ContentType ;
	view:range type:HTMLBody .
*/
var util=require('util');
var url=require('url');
var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var inputTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var inputTypes = db.getCollection(inputTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	//var templateInverse = db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;});
	var inputResource = input[inputTypes[0]];
	var fields = [];
	var tail = [];
	var node = input.node;
	var targetType = 'http://magnode.org/HTMLBodyField';

	input['db-mongodb-schema'].findOne({subject:inputTypes[0]}, function(err, typeDoc){
		if(!node.subject) node.subject=node.resource;
		var schema = typeDoc&&typeDoc.schema||{};
		var fieldType = 'http://magnode.org/field/object';
		var resources = {};
		for(var f in input) resources[f]=input[f];
		resources[fieldType] = {};
		for(var n in schema) resources[fieldType][n] = schema[n];
		resources[fieldType].name = '';
		resources[fieldType].value = node;
		var transformTypes = [];
		render.render(targetType, resources, transformTypes, haveRenderedForm);
	});

	function haveRenderedForm(err, res){
		if(err) return callback(err);
		var form = (res && res[targetType])?res[targetType]:escapeHTML(util.inspect(node));

		var action = url.parse(input.request.url, true);
		delete(action.search);
		delete(action.query.new);
		action.query.edit=true;
		//action.query.apply = ['http://magnode.org/transform/Post-form-urlencoded',templateInverse[0]];
		result =
			'<form action="'+escapeHTMLAttr(url.format(action))+'" method="post">'
			+ form
			+ '<input type="hidden" name="_id" value="'+escapeHTMLAttr(node._id||"")+'"/>'
			+ '<input type="hidden" name="auth" value="'+escapeHTMLAttr((input['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>'
			+ '</form>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
}
