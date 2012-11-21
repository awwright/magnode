var querystring=require('querystring');
var util=require("util");

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	request.on("data", function(segment){ requestDataBuffer.data += segment; });
	request.resume();
	function end(){
		callback({"http://magnode.org/FormFieldData":querystring.parse(input.requestDataBuffer.data)});
	}
	if(!request.readable){
		if(input.requestDataBuffer===undefined) throw new Error("Request data undefined on a closed socket");
		end();
	}
	request.on("end", end);
}
module.exports.URI = "http://magnode.org/transform/Post-form-urlencoded";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:HTTPRequest-form-urlencoded', 'requestDataBuffer'.l()]}
	, 'view:range': 'type:FormFieldData'
	}
