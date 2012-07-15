/*
e.g. Transform:DocumentHTML_BodyAuto_typeType_Form
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Form" ;
	view:domain type:ContentType ;
	view:range type:DocumentHTML_Body .
*/
var util=require('util');
var url=require('url');
var render=require('./view');
var escapeHTML=require('./htmlutils').escapeHTML;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	var fields = [];
	var tail = [];
	var node = input.node;
	var targetType = 'http://magnode.org/DocumentHTML_BodyField';

	input['db-mongodb-schema'].findOne({subject:templateInputType[0]}, function(err, typeDoc){
		if(!node.subject) node.subject=node.resource;
console.log(typeDoc.schema);
		var schema = typeDoc&&typeDoc.schema||{};
		var fieldType = 'http://magnode.org/field/object';
		var input = {};
		input[fieldType] = {};
		for(var n in schema) input[fieldType][n] = schema[n];
		input[fieldType].name = '';
		input[fieldType].value = node;
		var transformTypes = [];
		render.render(targetType, input, transformTypes, haveRenderedForm);
		// TODO make this a call to render.render()
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
			'<form action="'+escapeHTML(url.format(action))+'" method="post">'
			+ form
			+ '<input type="hidden" name="_id" value="'+escapeHTML(node._id||"")+'"/>'
			+ '</form>';
		var output = {};
		for(var j=0;j<templateOutputType.length;j++){
			output[templateOutputType[j]] = result;
		}
		callback(null, output);
	}
}
