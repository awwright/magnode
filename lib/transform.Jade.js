/*
Transform:SomeTransform
	a view:Jade ;
	view:file "path/to/template.jade" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var jade=require('jade');
var jadeCache;
module.exports = function(db, transform, input, callback){
	var templateFile = db.filter({subject:transform,predicate:"http://magnode.org/view/file"})[0].object.toString();
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	console.log("Jade rendering: "+templateFile+" to "+templateOutputType.join(","));
	jade.renderFile(templateFile, {cache:jadeCache, locals:{input:input}}, function(err, result){
		if(err){
			console.log("Jade error: "+err);
			callback({});
			return;
		}
		var output = {};
		for(var i=0;i<templateOutputType.length;i++){
			output[templateOutputType[i]] = result;
		}
		callback(output);
	});
}
module.exports.URI = "http://magnode.org/view/Jade";
