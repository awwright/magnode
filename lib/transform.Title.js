/*
e.g. Transform:SomeTransform
	a view:Jade ;
	view:domain type:ContentType ;
	view:titleProperty "label" ;
	view:range type:DocumentTitle .
*/
var util=require('util');
var fs = require('fs');

module.exports = function(db, tid, input, render, callback){
	var outputType = db.match(tid,"http://magnode.org/view/range").map(function(v){return v.object;});
	var titleProperty = db.match(tid,"http://magnode.org/view/titleProperty").map(function(v){return v.object;})[0];
	if(!titleProperty){
		throw new Error('Unknown property to read from');
	}
	var output = {};
	outputType.forEach(function(v){
		output[v] = input.node && input.node[titleProperty] || tid;
	});
	callback(null, output);
}
module.exports.URI = "http://magnode.org/view/Title";
module.exports.cache = {};
