var util=require("util");
module.exports = function(db, transform, input, render, callback){
	input.response.setHeader("Content-Type", "text/html");
	if(input.resource) input.response.setHeader("Content-Location", input.resource);
	if(!input["http://magnode.org/Document"]) return callback(new Error('No Document to send or invalid format'));
	input.response.end(input["http://magnode.org/Document"]);
	callback(null, {"http://magnode.org/HTTPResponse":200});
}
module.exports.URI = "http://magnode.org/transform/HTTP";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:Document']}
	, 'view:range': 'type:HTTPResponse'
	};
