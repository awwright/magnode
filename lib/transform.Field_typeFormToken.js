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

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementToken'];

	// FIXME this doesn't actually use the submitted value, just the generated one
	var value = input.rdf.resolve(':')+mix(input.node._id.bytes).toString('base64');

	var ret = {};
	for(var i=0; i<outputTypes.length; i++) ret[outputTypes[i]] = document;
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/MongoDBValue_typeFormFieldElementToken';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementToken']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueToken']
	};
