/*
e.g. Transform:HTMLBody_type<Type>_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeFormData_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/

// Right now this only handles a POST request, or technically, POST and PUT identically
// But we should create a new transform type for each HTTP method

var util=require('util');
var url=require('url');

var contenttype=require('contenttype');

var render=require('./render');
var relativeuri=require('./relativeuri');
var formatToken = require('./formatToken');

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceTypes = db.getCollection(resourceTypesFirst).map(function(v){ return v.toString(); });

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;

	var fieldData = resources["http://magnode.org/FormFieldData"];
	var document, parsedData, contentTypeProfile, operations=[], postCommit=[];

	if(typeof fieldData._id!='string'){
		return void processResponse(new Error('No _id field specified while using form submission'));
	}

	var targetType = 'http://magnode.org/FieldValue';
	var authResources = Object.create(resources);
	authResources.auth_token = fieldData._auth;
	var input = Object.create(authResources);
	// TODO: Does this pose some sort of security issue?
	input['http://magnode.org/fieldpost/Object'] = {name:''};
	input['http://magnode.org/FormFieldData'] = resources['http://magnode.org/FormFieldData'];
	transformTypes = ['http://magnode.org/view/FormDataTransform'];

	// Read the "profile" property off of the request.headers['content-type'] media-type
	if(request.headers['content-type']){
		var contentType = contenttype.parseMedia(request.headers['content-type']);
		if(contentType.type=='application/json') contentTypeProfile = contentType.prop.profile;
	}
	// A profile might not always be provided, like in DELETE
	if(!contentTypeProfile) contentTypeProfile = fieldData._type || resourceTypes[0];
	var resource = fieldData._subject || resources.resource;
	if(!resource){
		return void processResponse(new Error('Resource/subject is undefined'));
	}

	function parseFormAuth(){
		authz.test(authResources, ['parse'], resources, function(authorized){if(authorized===true){
			render.render(targetType, input, transformTypes, haveRenderedForm);
		}else{
			response.statusCode = 403;
			response.end("transform.HTMLBodyAuto_typeFormData_Post: Parse entity body to <"+resources.resource+">: Denied\n");
			return callback(null, {"http://magnode.org/HTTPResponse":403});
		}});
	}

	function haveRenderedForm(err, rendered){
		if(err){
			return void callback(err);
			response.write("transform.HTMLBodyAuto_typeFormData_Post: Cannot parse JSON for field schema.\n");
			response.write((err.stack||err.toString())+"\n");
			response.write("fieldData: "+util.inspect(fieldData)+"\n");
			response.write("input: "+util.inspect(resources)+"\n");
			response.end();
			callback(null, {"http://magnode.org/HTTPResponse":303});
			return;
		}
		parsedData = rendered['http://magnode.org/FieldValue'];

		var inputs = Object.create(resources.requestenv);
		var headers = {};
		if(!fieldData._id) headers['if-none-match'] = '*';
		else headers['if-match'] = '"'+fieldData._id+'"';
		// We don't actually need this, so long as it's used by PUT as an additional constistency check
		//headers['content-type'] = (new contenttype.MediaType('application/json', {profile:contentTypeProfile})).toString();
		inputs.request = {url:resource, headers:headers};
		var write = function write(v){ if(v) response.write(v); };
		inputs.response = {setHeader:function(n, v){response.write(n+': '+v+'\n');}, write:write, end:write};
		inputs.resource = resource;
		inputs.auth_token = fieldData._auth;
		inputs.node = parsedData;
		inputs[contentTypeProfile] = parsedData;
		var formatTypes = ['http://magnode.org/view/PutTransform'];
		render.render('http://magnode.org/HTTPResponse', inputs, formatTypes, processResponse);
	}

	function processResponse(err, put){
		var status = put && put['http://magnode.org/HTTPResponse'];
		if(err || !status){
			response.statusCode = 500;
			response.write(err.toString()+'\n');
		}else if(status>=400){
			response.statusCode = status;
		}else{
			response.statusCode = 303;
			// Take us to the canonical URL for this resource
			// TODO parse out a "self" link and go there, don't rely on a hardcoded properties
			//var action = url.parse((typeof parsedData.subject=='string')?parsedData.subject:resources.request.url, true);
			var action = url.parse(resources.request.url, true);
			delete action.search;
			delete action.query;
			response.setHeader("Location", relativeuri(resources.rdf, url.format(action)));
		}

		response.end("transform.HTMLBodyAuto_typeFormData_Post: Update <"+resources.resource+"> "+response.statusCode+"\n");
		callback(null, {"http://magnode.org/HTTPResponse":response.statusCode});
	}

	parseFormAuth();
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_Post";
