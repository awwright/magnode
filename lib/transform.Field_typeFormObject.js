/*
Transform:MongoDBValue_typeFormFieldElementObject
	a view:Transform, view:ModuleTransform;
	view:module "magnode/transform.Field_typeFormObject" ;
	view:domain type:FormFieldData, type:FormFieldElementObject ;
	view:range type:MongoDBValue .
*/
var util=require('util');
var url=require('url');
var render=require('./view');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var outputTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];

	var baseName = inputResource.name?(inputResource.name+'.'):"";
	var value = inputResource.value;
	var valueType = inputResource.items && inputResource.items.format;

	var fieldData = input["http://magnode.org/FormFieldData"];


	try {
		if(!fieldData||!fieldData[baseName+'fields']) throw new Error("Invalid form information");
		var fieldNames = JSON.parse(fieldData[baseName+'fields']);
		if(!fieldNames instanceof Array) throw new Error("Fields not listed");
	} catch(e){
		callback(e);
		return;
	}
	parseFields(fieldData, {}, fieldNames, {}, haveParsedFields);

	function parseFields(fieldData, node, fieldList, document, cb){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return cb(null, document);

		var targetType = 'http://magnode.org/MongoDBValue';
		var resources = {'http://magnode.org/FormFieldData': input["http://magnode.org/FormFieldData"]};
		// TODO: Does this pose some sort of security issue?
		resources['http://magnode.org/FormFieldElementObject'] = {name:''};
		transformTypes = [];

		//render.render(targetType, resources, transformTypes, function(err, res){
		//	if(err) return cb(err);
		//	if(res && res[targetType]){
		//		renderedFields[fieldName] = res[targetType];
		//	}else{
		//		return cb(new Error('No parsed field returned for '+fieldName));
		//	}
		//	renderFields(properties, node, fieldList, renderedFields, cb);
		//});

		var value = fieldData[baseName+'value.'+fieldName];
		switch(fieldData[baseName+'format.'+fieldName]){
			case 'ObjectId': document[fieldName] = value?new ObjectId(value):undefined; break;
			case 'json': document[fieldName] = JSON.parse(value); break;
			case 'string': document[fieldName] = value; break;
			case 'checkbox': document[fieldName] = (value=='1')?true:false; break;
			case 'array':
				var arrLength = parseInt(fieldData[baseName+'length.'+fieldName]);
				var value = document[fieldName] = [];
				if(!arrLength) break;
				for(var i=0; i<arrLength; i++){
					value.push(fieldData[baseName+'value.'+fieldName+'.'+i]);
				}
				break;
			case 'shadow':
				if(value && value==fieldData[baseName+'confirm.'+fieldName]){
					var newPassword = value;
					document[fieldName] = new ObjectId();
					input['db-mongodb-shadow'].insert({_id:document[fieldName], type:'pbkdf2', password:"BLABLABLABLABLABLABLABLA:1:BLABLABLABLA"}, end);
				}
				break;
			case 'noop':
				break;
			default:
				throw new Error('Unknown format '+JSON.stringify(fieldData[baseName+'format.'+fieldName])+' for field '+fieldName);
				break;
		}

		parseFields(fieldData, node, fieldList, document, cb);
	}

	function haveParsedFields(err, document){
		if(err) return callback(err);
		var ret = {};
		for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = document;
		callback(null, ret);
	}

}
