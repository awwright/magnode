/*
Transform:MongoDBValue_typeFormFieldElementObject
	a view:Transform, view:ModuleTransform;
	view:module "magnode/transform.Field_typeFormObject" ;
	view:domain type:FormFieldData, type:FormFieldElementObject ;
	view:range type:MongoDBValue .
*/
var util=require('util');
var url=require('url');
var render=require('./render');
var ObjectId = require('mongolian').ObjectId;

function cshiftl(v){
	return ((v<<1)+(v>>7))&0xFF;
}
function mix(s){
	var out = Buffer(s.length);
	s.copy(out);
	for(var i=1; i<out.length; i++) out[i] ^= cshiftl(out[i-1]);
	for(var i=out.length; i>0; i--) out[i-1] ^= cshiftl(out[i]);
	return out;
}

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
			case 'date': document[fieldName] = (value.toLowerCase()=='now')?new Date():new Date(value); break;
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
				// TODO provide existing password to update this field?
				// TODO Problems could happen if this value is changed by the user.
				// These ObjectIds are easily guessable, and the user could select another valid record.
				// Nothing bad should come of that, but they might find themselves locked out of their account.
				document[fieldName] = value?new ObjectId(value):undefined;
				// Even if these attack vectors are more secure than standard systems, the fact that there's still more of them is worrying
				if(!input['db-mongodb-shadow'] || !input['password-hash']) break;
				var newPassword = fieldData[baseName+'new.'+fieldName];
				if(newPassword && newPassword==fieldData[baseName+'confirm.'+fieldName]){
					// TODO if this ever collides, that's bad. Maybe do a sanity test to make sure the record doesn't already exist.
					var shadowId = document[fieldName] = new ObjectId();
					input['password-hash']({password:newPassword}, function(shadowRecord){
						// Using save() means this record doesn't have to exist, but it will be replaced entirely if it does.
						// So, we can't use the same database as nodes. Could be a problem later.
						shadowRecord._id = shadowId;
						input['db-mongodb-shadow'].save(shadowRecord, function(){ parseFields(fieldData, node, fieldList, document, cb); });
						// TODO schedule the old password to be removed from shadow? Or define some cleaning function.
					});
					return;
				}
				break;
			case 'token':
				document[fieldName] = input.rdf.resolve(':')+mix(input.node._id.bytes).toString('base64');
				break;
			case 'noop':
				break;
			case 'undefined':
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
