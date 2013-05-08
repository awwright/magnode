var querystring=require('querystring');

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	request.on("data", function(segment){ input.requestDataBuffer.data += segment; });
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
	{ a: ['view:Transform', 'view:FormTransform', 'view:DeleteFormTransform', 'view:ViewTransform', 'view:PostTransform', 'view:DeleteTransform']
	, 'view:domain': {$list:['type:HTTPRequest-form-urlencoded', 'requestDataBuffer'.l()]}
	, 'view:range': 'type:FormFieldData'
	}
