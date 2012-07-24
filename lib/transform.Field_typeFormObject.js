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


	var document = {};

	try {
		if(!fieldData||!fieldData[baseName+'fields']) throw new Error("Invalid form information");
		var fieldNames = JSON.parse(fieldData[baseName+'fields']);
		if(!fieldNames instanceof Array) throw new Error("Fields not listed");
		for(var i=0; i<fieldNames.length; i++){
			var name = fieldNames[i];
			var value = fieldData[baseName+'value.'+name];
			switch(fieldData[baseName+'format.'+name]){
				case 'ObjectId': document[name] = value?new ObjectId(value):undefined; break;
				case 'json': document[name] = JSON.parse(value); break;
				case 'string': document[name] = value; break;
				case 'checkbox': document[name] = (value=='1')?true:false; break;
				case 'array':
					var arrLength = parseInt(fieldData[baseName+'length.'+name]);
					var value = document[name] = [];
					if(!arrLength) break;
					for(var i=0; i<arrLength; i++){
						value.push(fieldData[baseName+'value.'+name+'.'+i]);
					}
					break;
				case 'shadow':
					if(value && value==fieldData[baseName+'confirm.'+name]){
						var newPassword = value;
						document[name] = new ObjectId();
						input['db-mongodb-shadow'].insert({_id:document[name], type:'pbkdf2', password:"BLABLABLABLABLABLABLABLA:1:BLABLABLABLA"}, end);
					}
					break;
				case 'noop':
					break;
				default:
					throw new Error('Unknown format '+JSON.stringify(fieldData[baseName+'format.'+name])+' for field '+name);
					break;
			}
		}
	} catch(e){
		callback(e);
		return;
	}

	var ret = {};
	for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = document;
	callback(null, ret);
}
