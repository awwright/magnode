var util=require("util");
module.exports = function(db, transform, input, render, callback){
	// Continue reading requests that may be in the pipeline
	input.request.resume();
	var doc = input["http://magnode.org/Document"];
	if(!input.response.getHeader('Content-Type')){
		input.response.setHeader('Content-Type', input['HTTP-Content-Type']||'text/html;charset=utf-8');
	}
	if(!doc) return void callback(new Error('No Document to send or invalid format'));
	var res = (doc instanceof Buffer)?doc:new Buffer(doc.toString());
	input.response.setHeader("Content-Length", res.length);
	input.response.end(res);
	callback(null, {"http://magnode.org/HTTPResponse":200});
}
module.exports.URI = "http://magnode.org/transform/HTTP";
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:DeleteFormTransform', 'view:GetTransform', 'view:PostTransform', 'view:DeleteTransform']
	, 'view:domain': {$list:['type:Document']}
	, 'view:range': 'type:HTTPResponse'
	};
