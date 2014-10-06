/*
e.g. Transform:HTMLBodyAuto_typeType_Form
	a view:ModuleTransform, view:PutFormTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Form" ;
	view:domain ( type:Type type:UserSession ) ;
	view:range type:HTMLBody .
*/
var util=require('util');
var url=require('url');

var jsonschema = require('jsonschema');

var render=require('./render');
var relativeURI=require('./relativeuri');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object.toString();});
	//var templateInverse = db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;});
	var node = resources[resourcesTypes[0]];
	var fields = [];
	var tail = [];
	var targetType = 'http://magnode.org/HTMLBodyField';
	var typeDocId, schema;
	var validator = new jsonschema.Validator();

	if(!resources['db-mongodb-schema']) throw new Error('db-mongodb-schema not provided');
	resources['db-mongodb-schema'].findOne({id:resourcesTypes[0].toString()}, function(err, typeDoc){
		schema = typeDoc;
		if(!schema){
			throw new Error('Schema <'+resourcesTypes[0].toString()+'> not found');
			// TODO return a proper status code
		}
		typeDocId = schema.id || typeDoc.subject || typeDoc._id;
		validator.addSchema(schema, typeDocId);
		var fieldType = 'http://magnode.org/field/object';
		var input = Object.create(resources);
		for(var f in resources) input[f]=resources[f];
		input[fieldType] = {};
		input.jsonschema = validator;
		for(var n in schema) input[fieldType][n] = schema[n];
		input[fieldType].name = '';
		input[fieldType].value = node;
		var transformTypes = ['http://magnode.org/view/PutFormTransform'];
		render.render(targetType, input, transformTypes, haveRenderedForm);
	});

	function haveRenderedForm(err, res){
		if(err) return void callback(err);
		var form = (res && res[targetType])?res[targetType]:escapeHTML(util.inspect(node));
		var docEtag = node[schema.etagField] && (node[schema.etagField]+'');
		var putFn = Object.create(resources.variant);
		putFn.requiredTypes = ['http://magnode.org/HTTPResponse_PutFn'];
		var result =
			'<form action="'+escapeHTMLAttr(relativeURI(resources.rdf, putFn.toURI()))+'" method="post">'
			+ form
			+ '<input type="hidden" name=":_id" value="'+escapeHTMLAttr(node._id||"")+'"/>'
			+ '<input type="hidden" name=":if-match" value="'+escapeHTMLAttr(docEtag?('"'+docEtag+'"'):'')+'"/>'
			+ '<input type="hidden" name=":if-none-match" value="'+escapeHTMLAttr(node._id?'':'*')+'"/>'
			+ '<input type="hidden" name=":subject" value="'+escapeHTMLAttr(resources.variant.resource)+'"/>'
			+ '<input type="hidden" name=":type" value="'+escapeHTMLAttr(typeDocId||"")+'"/>'
			+ '<input type="hidden" name=":auth" value="'+escapeHTMLAttr((resources['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>'
			+ '<input type="submit" class="submit" value="Submit"/>'
			+ '</form>';
		var output = {};
		outputTypes.forEach(function(v){output[v]=result;});
		callback(null, output);
	}
}
