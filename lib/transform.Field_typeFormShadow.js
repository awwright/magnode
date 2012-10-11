module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementShadow'];

	// TODO provide existing password to update this field?
	// TODO Problems could happen if this value is changed by the user.
	// These ObjectIds are easily guessable, and the user could select another valid record.
	// Nothing bad should come of that, but they might find themselves locked out of their account.
	document[fieldName] = value?new ObjectId(value):undefined;
	// Even if these attack vectors are more secure than standard systems, the fact that there's still more of them is worrying
	if(!input['db-mongodb-shadow'] || !input['password-hash']) return callback(new Error('No shadow-db or password-hash defined'));
	var newPassword = fieldData[inputElement.name+'.new'];
	if(newPassword && newPassword==fieldData[inputElement.name+'.confirm']){
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


	var ret = {};
	for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = document;
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/MongoDBValue_typeFormFieldElementObject';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementShadow']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueShadow']
	};
