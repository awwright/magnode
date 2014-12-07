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
	var outputTypes = db.match(tid,"http://magnode.org/view/templateRange").map(function(v){return v.object;});
	if(!outputTypes.length){
		// If we don't know any values for this let's assume it's the same as the range
		// view:templateRange is a subPropertyOf view:range
		var outputTypes = db.match(tid,"http://magnode.org/view/range").map(function(v){return v.object;});
	}
	var titleOutputType = db.match(tid,"http://magnode.org/view/titleProperty").map(function(v){return v.object;});
	//console.log("Jade rendering: "+templateFile+" to "+outputType.join(","));
	var cache = module.exports.cache;
	var ret;
	function localurl(url){ return relativeuri(input.rdf, url); }
	var locals = {
		doctype: 'xml',
		input: input,
		localurl: localurl
	};
	jade.renderFile(templateFile, locals, function(error, result){
		if(error) result=error.stack||error.toString();
		var output = {};
		outputTypes.forEach(function(v){
			switch(v){
			case 'http://magnode.org/DocumentTitle':
				output[v] = input.node && input.node[titleOutputType] || tid;
				break;
			case 'http://magnode.org/ResourceMenu':
				output[v] = [];
				break;
			default:
				output[v] = result;
				break;
			}
		});
		callback(null, output);
	});
}
module.exports.URI = "http://magnode.org/view/Jade";
module.exports.cache = {};
