var querystring=require('querystring');
var rdfenv = require('rdf').environment;

var requestBody = require('./requestbody').readRequestBody;

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	if(!request.readable){
		if(input.requestDataBuffer===undefined) throw new Error("Request data undefined on a closed socket");
		end();
	}
	requestBody(request, 1000, end);
	function end(err, body){
		var data = querystring.parse(body);
		callback(null, {"http://magnode.org/FormFieldData":data});
	}
}
module.exports.URI = "http://magnode.org/transform/Post-form-urlencoded";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform', 'view:Core']
	, 'view:domain': {$list:['type:HTTPRequest-form-urlencoded', rdfenv.createLiteral('requestDataBuffer')]}
	, 'view:range': 'type:FormFieldData'
	}
