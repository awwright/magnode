var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var fieldData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementShadow'];
	var authz = input.authz;

	// Even if these attack vectors are more secure than standard systems, the fact that there's more of them total is still worrysome
	if(!input['db-mongodb-shadow'] || !input['password-hash']) return callback(new Error('No shadow-db or password-hash defined'));
	var newPassword = fieldData[inputElement.name+'.new'];
	if(newPassword && newPassword==fieldData[inputElement.name+'.confirm']){
		newPasswordProvided();
	}else{
		returnValue(new ObjectId(fieldData[inputElement.name+'.value']));
	}

	function newPasswordProvided(){
		authz.test(null, "calculate-shadow", input, function(authorized){if(authorized){
			input['password-hash']({password:newPassword}, function(shadowRecord){
				returnValue(shadowRecord);
			});
		}else{
			return callback(new Error('CALCULATE-SHADOW: Not authorized'));
		}});
	}

	function returnValue(value){
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=value;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementShadow';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:fieldpost/Shadow']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueShadow']
	};
