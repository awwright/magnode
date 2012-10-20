var ObjectId = require('mongolian').ObjectId;

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var fieldData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementShadow'];
	var authz = input.authz;

	// TODO provide existing password to update this field?
	// TODO Problems could happen if this value is changed by the user.
	// These ObjectIds are easily guessable, and the user could select another valid record.
	// Nothing bad should come of that, but they might find themselves locked out of their account.

	// Even if these attack vectors are more secure than standard systems, the fact that there's more of them total is still worrysome
	if(!input['db-mongodb-shadow'] || !input['password-hash']) return callback(new Error('No shadow-db or password-hash defined'));
	var newPassword = fieldData[inputElement.name+'.new'];
	if(newPassword && newPassword==fieldData[inputElement.name+'.confirm']){
		newPasswordProvided();
	}else{
		returnValue(fieldData[inputElement.name+'.value']);
	}

	function newPasswordProvided(){
		authz.test(null, "put-shadow", input, function(authorized){if(authorized){
			input['password-hash']({password:newPassword}, function(shadowRecord){
				shadowRecord._id = new ObjectId();
				input['db-mongodb-shadow'].insert(shadowRecord, function(err){
					if(err) return callback(err);
					returnValue(shadowRecord._id);
					input['db-mongodb-shadow'].remove({_id:new ObjectId(fieldData[inputElement.name+'.value'])});
				});
			});
		}else{
			return callback(new Error('PUT-SHADOW: Not authorized'));
		}});
	}

	function returnValue(value){
		var oid = (typeof value)=='string'?new ObjectId(value):value;
		var ret = {};
		outputTypes.forEach(function(v){ret[v] = oid;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementShadow';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementShadow']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueShadow']
	};
