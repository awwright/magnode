/*
e.g. Transform:SomeTransform
	a view:Jade ;
	view:file "path/to/template.jade" ;
	view:range type:HTMLBody ;
	view:domain type:ContentType .
*/
var util=require('util');
var fs = require('fs');

var jade=require('jade');

var relativeuri = require('./relativeuri');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, tid, input, render, callback){
	var templateFile = db.match(tid,"http://magnode.org/view/file")[0].object.toString().replace(/^file:\/\//,'');
	var outputTypes = db.match(tid,"http://magnode.org/view/range").map(function(v){return v.object;});
	//console.log("Jade rendering: "+templateFile+" to "+outputType.join(","));
	var cache = module.exports.cache;
	var ret;
	function localurl(url){ return relativeuri(input.rdf, input.request.uri, url); }
	var locals = {
		doctype: 'xml',
		input: input,
		localurl: localurl,
		inspect: require('util').inspect,
	};
	jade.renderFile(templateFile, locals, function(error, result){
		if(error) result=error.stack||error.toString();
		var output = {};
		outputTypes.forEach(function(v){ output[v] = result; });
		callback(null, output);
	});
}
module.exports.URI = "http://magnode.org/view/Jade";
module.exports.cache = {};
