var querystring=require('querystring');
var rdfenv = require('rdf').environment;

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	request.resume();
	function end(){
		var data = querystring.parse(input.requestDataBuffer.data);
		callback(null, {"http://magnode.org/FormFieldData":data});
	}
	if(!request.readable){
		if(input.requestDataBuffer===undefined) throw new Error("Request data undefined on a closed socket");
		end();
	}
	request.on("end", end);
}
module.exports.URI = "http://magnode.org/transform/Post-form-urlencoded";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform']
	, 'view:domain': {$list:['type:HTTPRequest-form-urlencoded', rdfenv.createLiteral('requestDataBuffer')]}
	, 'view:range': 'type:FormFieldData'
	}
