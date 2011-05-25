/*
Transform:SomeTransform
	a view:Jade ;
	view:file "path/to/template.jade" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var schema=require('magnode/schema');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(transform, input, callback){
	var templateInputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	schema(input.db, templateInputType[0], function(fields){
		// Show a field for each field that the type provides
		var result = [];
		for(var i=0;i<fields.length;i++){
			var label = input.db.filter({subject:fields[i],predicate:"http://www.w3.org/2000/01/rdf-schema#label"})[0];
			var title = (label&&label.object&&label.object.toString()) || fields[i];
			var propertyTypes = input.db.filter({subject:fields[i],predicate:"http://www.w3.org/1999/02/22-rdf-syntax-ns#type"}).map(function(v){return v.object;});
			var content = input.db.filter({subject:inputResource,predicate:fields[i]})[0].object.toString();
			result.push("<dt>"+title+" (a "+propertyTypes.join(",")+")</dt><dd>"+content+"</dd>");
		}
		result = "<dl>"+result.join("")+"</dl>";
		var output = {};
		for(var i=0;i<templateOutputType.length;i++){
			output[templateOutputType[i]] = result;
		}
		callback(output);
	});
}
