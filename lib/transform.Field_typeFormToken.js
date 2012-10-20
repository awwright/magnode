var rdf=require('rdf');
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

module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputData = input['http://magnode.org/FormFieldData'];
	var inputElement = input['http://magnode.org/FormFieldElementToken'];

	input.object.on('parsed', function(document){
		var subject = inputData[inputElement.name+'.pattern'];
		if(document.posted instanceof Date){
			var theDate = document.posted;
			subject = subject.replace('#{posted.Y}', ('0000'+theDate.getFullYear()).substr(-4));
			subject = subject.replace('#{posted.m}', ('00'+theDate.getMonth()).substr(-2));
			subject = subject.replace('#{posted.d}', ('00'+theDate.getDay()).substr(-2));
		}
		if(typeof document.label=='string'){
			var urllabel = document.label.toLowerCase().replace(/\s+/g, '-');
			subject = subject.replace('#{label.formatURL}', urllabel);
		}
		var id = document._id || input.node._id;
		if(id instanceof ObjectId){
			subject = subject.replace('#{_id}', id.bytes.toString('hex'));
			subject = subject.replace('#{_id.mix}', mix(id.bytes).toString('base64').replace(/\+/g,'-').replace(/\//g,'_'));
		}
		subject = subject.replace(/#\{[^}]\}/g, 'undefined');
		document[inputElement.name] = (new rdf.IRI(input.rdf.resolve(':'))).resolveReference(subject).toString();
	});

	var ret = {};
	outputTypes.forEach(function(v){ret[v] = null;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElementToken';
module.exports.about =
	{ a: ['view:Transform', 'view:FormDataTransform']
	, 'view:domain': {$list:['type:FormFieldData','type:FormFieldElementToken']}
	, 'view:range': ['type:FieldValue', 'type:FieldValueToken']
	};
