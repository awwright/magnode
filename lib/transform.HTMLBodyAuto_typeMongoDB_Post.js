/*
e.g. Transform:HTMLBodyAuto_typeType_Post
	a view:ModuleTransform, view:Transform, view:PostTransform ;
	jst:module "magnode/transform.HTMLBodyAuto_typeMongoDB_Post" ;
	view:range type:Type, type:HTTPRequest-www-form-urlencoded ;
	view:domain type:HTTPResponse .
*/
var util=require("util");
var url=require("url");
var render=require('./render');
var relativeuri=require('./relativeuri');
var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	var fieldData = input["http://magnode.org/FormFieldData"];
	var correctToken = (input['http://magnode.org/UserSession']||{}).formToken||'anonymous';
	if(correctToken!==fieldData._auth){
		response.statusCode = 403;
		response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">: Denied (bad token)\n");
		return callback({"http://magnode.org/HTTPResponse":403});
	}
	var document, parsedData, operations=[], postCommit=[];

	var targetType = 'http://magnode.org/FieldValue';
	var resources = Object.create(input);
	// TODO: Does this pose some sort of security issue?
	resources['http://magnode.org/FormFieldElementObject'] = {name:''};
	resources['http://magnode.org/FormFieldData'] = input['http://magnode.org/FormFieldData'];
	transformTypes = ['http://magnode.org/view/FormDataTransform'];

	function testAuth(){
		authz.test(null, "parse", input, function(authorized){if(authorized){
			render.render(targetType, resources, transformTypes, haveRenderedForm);
		}else{
			response.statusCode = 403;
			response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">: Denied\n");
			callback({"http://magnode.org/HTTPResponse":403});
		}});
	}

	function haveRenderedForm(err, resources){
		if(err){
			return callback(err);
			response.write("transform.HTMLBodyAuto_typeMongoDB_Post: Cannot parse JSON for field schema.\n");
			response.write((err.stack||err.toString())+"\n");
			response.write("fieldData: "+util.inspect(fieldData)+"\n");
			response.write("input: "+util.inspect(input)+"\n");
			response.end();
			callback(null, {"http://magnode.org/HTTPResponse":303});
			return;
		}
		parsedData = resources['http://magnode.org/FieldValue'];
		input['db-mongodb-schema'].findOne({subject:fieldData._type}, haveSchema);
	}
	function haveSchema(err, typeDoc){
		var schema = typeDoc.schema;
		parsedData._id = new ObjectId(fieldData._id);
		schema.updateDocument = {set:{key:"_id", ifMatch:"_etag"}};
		parseDocumentToSchema(schema, parsedData, {}, postUpdate);
		function parseDocumentToSchema(schema, instance, operation, cb){
			// This function modifies a Mongo document based on input parsed against
			// a schema that defines how to modify the document. D'oh.

			if(schema.type=='shadow'){
				// FIXME let's not worry about this just yet. But password setting is broken, AGAIN
				// TODO provide existing password to update this field?
				// TODO Problems could happen if this value is changed by the user.
				// These ObjectIds are easily guessable, and the user could select another valid record.
				// Nothing bad should come of that, but they might find themselves locked out of their account.
				if(instance instanceof ObjectId){
					cb(instance);
				}else if(instance){
					var id = instance._id = new ObjectId();
					input['db-mongodb-shadow'].insert(instance, function(err){
						if(err) throw err;
						console.log('INSERT SHADOW('+id.toString()+'): ', instance);
						debugger;
						cb(id);
						// FIXME delete old record
						//input['db-mongodb-shadow'].remove({_id:new ObjectId(fieldData[inputElement.name+'.value'])});
					});
				}else{
					cb();
				}
			}else if(schema.updateDocument){
				if(schema.updateDocument.select){
					// A select property means we're copying from another document
					//input['db-mongodb'].findOne({_id:instance._id, _rev:new ObjectId(fieldData._etag)}, function(err, doc){
					input['db-mongodb'].findOne({_id:instance._id}, function(err, doc){
						//var doc={_id:new ObjectId()};
						decendSchema(schema, instance, doc, function(value){
							cb(id);
						});
					});
				}else if(schema.updateDocument.set){
					// If existing _id does not exist, insert document
					// Elif existing document matches _etag, update document
					// Else return 412 Precondition Failed
					decendSchema(schema, instance, {}, function(value){
						var id = value._id;
						var etag = fieldData._etag;
						delete value._id;
						instance._etag = new ObjectId();
						document = value;
						if(id){
							input['db-mongodb'].update({_id:id}, {$set:value}, operationFinished);
						}else{
							input['db-mongodb'].insert(value, true, operationFinished);
						}
						function operationFinished(err){ cb(id); }
					});
				}else{
					var newDoc = {_id: new ObjectId};
					decendSchema(schema, instance, newDoc, function(value){
						console.log('INSERT: ', value);
						cb(newDoc);
					});
				}
			}else{
				decendSchema(schema, instance, operation, cb);
			}

			function decendSchema(schema, instance, parentDoc, cb){
				var schemaTypes = (schema.type instanceof Array)?schema.type:[schema.type];
				if(schemaTypes.indexOf('any')>=0) schemaTypes=null;
				function hasType(v){ return schemaTypes.indexOf(v)>=0 || schemaTypes===null; }
				if(instance instanceof Date && hasType('Date')){
					return cb(instance);
				}else if(instance instanceof ObjectId && hasType('ObjectId')){
					return cb(instance);
				}else if(instance instanceof Array && hasType('array')){
					var result = [];
					function nextKey(i){
						if(i>=instance.length) return cb(result);
						var value = parseDocumentToSchema(schema.items, instance[i], result[i], function(value){
							result[i] = value;
							nextKey(i+1);
						});
					}
					nextKey(0);
				}else if(typeof instance=='string' && hasType('string')){
					return cb(instance);
				}else if(typeof instance=='number' && (hasType('integer')||hasType('number'))){
					if(!hasType('number') && Math.floor(instance)!=instance){
						throw new Error('Invalid value passed');
					}
					if(typeof schema.minimum=='number'){
						if(schema.exclusiveMinimum?(instance<=schema.minimum):(instance<schema.minimum)){
							throw new Error('Instance too low');
						}
					}
					if(typeof schema.maximum=='number'){
						if(schema.exclusiveMaximum?(instance>=schema.maximum):(instance>schema.maximum)){
							throw new Error('Instance too high');
						}
					}
					return cb(instance);
				}else if(typeof instance=='boolean' && hasType('boolean')){
					return cb(instance);
				}else if(instance===null && hasType('null')){
					return cb(null);
				}else if(typeof instance=='object' && hasType('object')){
					var result={};
					for(var k in parentDoc) result[k]=parentDoc[k];
					function handleProperties(){
						// We're iterating through an Object
						var properties = Object.keys(schema.properties);
						function nextKey(i){
							if(properties[i]===undefined) return handleAdditionalProperties();
							var n = properties[i];
							var value = parseDocumentToSchema(schema.properties[n], instance[n], result[n], function(value){
								if(value!==undefined) result[n] = value;
								nextKey(i+1);
							});
						}
						nextKey(0);
					}
					if(schema.properties) handleProperties();
					else handleAdditionalProperties();
					// handle patternProperties here
					function handleAdditionalProperties(){
						var additionalProperties = schema.additionalProperties || {};
						var additionalKeys = Object.keys(instance).filter(function(n){ return !schema.properties[n]; });
						if(additionalProperties===false){
							if(additionalKeys.length){
								throw new Error('Additional properties not allowed: '+additionalKeys);
							}
							return cb(result);
						}else{
							function nextKey(i){
								if(additionalKeys[i]===undefined) return cb(result);
								var n = properties[i];
								parseDocumentToSchema(schema.properties[n], instance[n], result[n], function(value){
									if(value!==undefined) result[n] = value;
									nextKey(i+1);
								});
							}
							nextKey(0);
						}
					}
				}else if(instance===undefined){
					if(schema.default) return cb(schema.default);
					else if(schema.required) throw new Error('Required property not found');
					return cb();
				}else{
					throw new Error('Type/schema mismatch: '+(typeof instance)+' vs '+schemaTypes);
				}
			}
		}
	}
	function postUpdate(err, doc){
		postCommit.forEach(function(){
			console.log('Um, do something here');
		});
		haveResponse();
	}
	function haveResponse(){
		//response.write(util.inspect(arguments)+"\n\n");
		// respond with "303 See Other" and "Location:" to that resource
		// (instruct the client to GET the newly updated resource), and return
		response.statusCode = 303;
		var action;
		if(typeof document.subject=='string') action = url.parse(document.subject, true);
		else action = url.parse(input.request.url, true);
		delete action.search;
		delete action.query;
		response.setHeader("Location", relativeuri(input.rdf, url.format(action)));
		response.end("transform.HTMLBodyAuto_typeMongoDB_Post: Update <"+input.resource+">\n");
		callback(null, {"http://magnode.org/HTTPResponse":303});
	}

	testAuth();
}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
