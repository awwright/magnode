var util=require("util");
module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/Document"];
	input.response.setHeader("Content-Type", "text/html;charset=utf-8");
	if(input.resource) input.response.setHeader("Content-Location", input.resource);
	if(input.resource) input.response.setHeader("X-Content-About", input.resource);
	if(!doc) return void callback(new Error('No Document to send or invalid format'));
	var res = (doc instanceof Buffer)?doc:new Buffer(doc.toString());
	input.response.setHeader("Content-Length", res.length);
	input.response.end(res);
	callback(null, {"http://magnode.org/HTTPResponse":200});
}
module.exports.URI = "http://magnode.org/transform/HTTP";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:domain': {$list:['type:Document']}
	, 'view:range': 'type:HTTPResponse'
	};
