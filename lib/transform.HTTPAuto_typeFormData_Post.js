/*
Accept an HTML form input to make a PUT request with a JSON document, including If-Match and Authorization information

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
var HttpServerResponse = require('http').ServerResponse;

var contenttype=require('contenttype');

var render=require('./render');
var relativeuri=require('./relativeuri');

module.exports = function(db, transform, resources, render, callback){
	var resourceTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();})[0];
	var resourceTypes = db.getCollection(resourceTypesFirst).map(function(v){ return v.toString(); });

	var request = resources.request;
	var response = resources.response;
	var authz = resources.authz;
	var document, parsedData, fieldData, resource, contentTypeProfile, operations=[], body='';

	var upload = Object.create(resources);
	upload['http://magnode.org/HTTPRequest-form-urlencoded'] = resources.request;
	render.render('http://magnode.org/FormFieldData', upload, [], parseFormAuth);
	function parseFormAuth(err, rendered){
		if(err) return void callback(err);
		fieldData = rendered['http://magnode.org/FormFieldData'];

		var targetType = 'http://magnode.org/FieldValue';
		var authResources = Object.create(resources);
		authResources.auth_token = fieldData[':auth'];
		var input = Object.create(authResources);
		// TODO: Does this pose some sort of security issue?
		input['http://magnode.org/fieldpost/Object'] = {name:''};
		input['http://magnode.org/FormFieldData'] = fieldData;
		transformTypes = ['http://magnode.org/view/FormDataTransform'];

		// Read the "profile" property off of the request.headers['content-type'] media-type
		if(request.headers['content-type']){
			var contentType = contenttype.parseMedia(request.headers['content-type']);
			if(contentType.type=='application/json') contentTypeProfile = contentType.prop.profile;
		}
		// A profile might not always be provided, like in DELETE
		if(!contentTypeProfile) contentTypeProfile = fieldData[':type'] || resourceTypes[0];
		resource = fieldData[':subject'] || resources.resource;
		if(!resource){
			return void processResponse(new Error('Resource/subject is undefined'));
		}

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

		var inputs = Object.create(Object.getPrototypeOf(resources.requestenv));
		var headers = {};
		if(fieldData[':_id']) headers['m-if-match-id'] = fieldData[':_id'];
		if(fieldData[':if-match']) headers['if-match'] = fieldData[':if-match'];
		else if(fieldData[':if-none-match']) headers['if-none-match'] = '*';
		// We don't actually need this, so long as it's used by PUT as an additional consistency check
		//headers['content-type'] = (new contenttype.MediaType('application/json', {profile:contentTypeProfile})).toString();
		inputs.request = {url:resource, headers:headers};
		inputs.response = new HttpServerResponse({});
		inputs.response.write = inputs.response.end = function(v){ if(v) body += v.toString(); }
		inputs.resource = resource;
		inputs.variant = {params:{}, resource:resource};
		inputs.requestenv = resources.requestenv; // FIXME this won't do at all!
		inputs.auth_token = fieldData[':auth'];
		inputs.node = parsedData;
		inputs[contentTypeProfile] = parsedData;
		var formatTypes = ['http://magnode.org/view/PutTransform'];
		render.render('http://magnode.org/HTTPResponse', inputs, formatTypes, processResponse);
	}

	function processResponse(err, put){
		var status = put && put['http://magnode.org/HTTPResponse'];
		if(err || !status){
			response.write('Error calling PUT ('+response.statusCode+')\n');
			response.statusCode = 500;
			response.write(err.toString()+'\n');
		}else if(status>=400){
			response.statusCode = status;
		}else{
			response.statusCode = 303;
			// Take us to the canonical URL for this resource
			response.setHeader("Location", put.response.getHeader('Location'));
		}
		//put.response.pipe(response);
		response.write(body);
		response.end("transform.HTMLBodyAuto_typeFormData_Post: Update <"+resources.resource+"> "+response.statusCode+"\n");
		callback(null, {"http://magnode.org/HTTPResponse":response.statusCode});
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_Post";
