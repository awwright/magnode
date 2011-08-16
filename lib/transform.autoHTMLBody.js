/*
Transform:SomeTransform
	a view:ModuleTransform, view:ViewTransform ;
	view:module "magnode/transform.autoHTMLBody" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var schema=require('magnode/schema');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = input.db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	schema(input.db, templateInputType[0], function(fields){
		// Show a field for each field that the type provides
		var result = new Array(fields.length);
		var finished = 0;
		for(var i=0;i<fields.length;i++) (function(i){
			var fieldRange = input.db.filter({subject:fields[i],predicate:"http://www.w3.org/2000/01/rdf-schema#range"}).map(function(v){return v.object;});
			var inputs = {};
			for(var j=0;j<fieldRange.length;j++) inputs[fieldRange[j]] = fields[j];
			render.render("http://magnode.org/DocumentHTML_Body", inputs, function(formatted){
				if(formatted && formatted['http://magnode.org/DocumentHTML_Body']){
					result[i] = formatted['http://magnode.org/DocumentHTML_Body'];
				}else{
					var label = input.db.filter({subject:fields[i],predicate:"http://www.w3.org/2000/01/rdf-schema#label"})[0];
					var title = (label&&label.object&&label.object.toString()) || fields[i];
					var propertyTypes = input.db.filter({subject:fields[i],predicate:"http://www.w3.org/1999/02/22-rdf-syntax-ns#type"}).map(function(v){return v.object;});
					var content = input.db.filter({subject:inputResource,predicate:fields[i]})[0].object.toString();
					result[i] = "<h3 title=\"a "+propertyTypes.join(",")+"\">"+title+"</h3><div>"+content+"</div>";
				}
				finished++;
				if(finished===fields.length){
					result = result.join("");
					var output = {};
					for(var j=0;j<templateOutputType.length;j++){
						output[templateOutputType[j]] = result;
					}
					callback(output);
				}
			});
		})(i);
	});
}
