/*
Accept an HTML form input to make a PUT request with a JSON document, including If-Match and Authorization information

e.g. Transform:HTMLBody_type<Type>_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeFormData_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/

var util=require('util');
var url=require('url');
var HttpServerResponse = require('http').ServerResponse;

var contenttype=require('contenttype');

var render=require('./render');
var relativeuri=require('./relativeuri');

module.exports = function(db, transform, resources, render, callback){
	var range = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object.toString();});
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
		if(!contentTypeProfile) contentTypeProfile = fieldData[':type'];
		// This isn't necessarially true, a user might provide data of one type, and it gets converted to
		// this type before handed over here
		if(contentTypeProfile && contentTypeProfile!==resourceTypes[0]){
			//throw new Error('supplied type mismatches target type');
		}
		resource = fieldData[':subject'] || resources.resource;
		// TODO throw an error if subject != request resource?
		if(!resource){
			return void processResponse(new Error('Resource/subject is undefined'));
		}

		if(!contentTypeProfile){
			contentTypeProfile = resourceTypes[0];
			parsedData = resources[contentTypeProfile];
			return void createRequest();
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
		createRequest();
	}

	function createRequest(){
		var inputs = Object.create(Object.getPrototypeOf(resources.requestenv));
		var headers = {};
		if(fieldData[':_id']) headers['m-if-match-id'] = fieldData[':_id'];
		if(fieldData[':if-match']) headers['if-match'] = fieldData[':if-match'];
		else if(fieldData[':if-none-match']) headers['if-none-match'] = '*';
		// We don't actually need this when we're setting `inputs` directly, unless
		// maybe it's used by PUT as an additional consistency check
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
		var formatTypes;
		// TODO maybe add POST which seems silly but what if someone wants to POST JSON from an HTML form?
		switch(fieldData[':method']){
			case 'PUT': formatTypes = ['http://magnode.org/view/PutTransform']; break;
			case 'DELETE':  formatTypes = ['http://magnode.org/view/DeleteTransform']; break;
			default: return void callback(new Error('Invalid form method passed'));
		}
		render.render('http://magnode.org/HTTPResponse', inputs, formatTypes, processResponse);
	}

	function processResponse(err, put){
		var status = put && put['http://magnode.org/HTTPResponse'];
		if(err || !status){
			response.write('Error calling '+fieldData[':method']+' ('+response.statusCode+'):\n');
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
		var res = {};
		range.forEach(function(v){ res[v] = null; });
		res["http://magnode.org/HTTPResponse"] = response.statusCode;
		callback(null, res);
	}
}
module.exports.URI = "http://magnode.org/transform/autoHTTP_Post";
