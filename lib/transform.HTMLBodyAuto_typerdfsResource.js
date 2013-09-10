/*
e.g. Transform:SomeTransform
	a view:ModuleTransform, view:GetTransform ;
	view:module "magnode/transform.autoHTMLBody" ;
	view:range type:HTMLBody ;
	view:domain type:ContentType .
*/
var util=require('util');
var schema=require('./schema');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = input.db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var templateOutputType = input.db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.match(templateOutputType[0],"http://magnode.org/view/file")[0].object.toString();
	schema(input.db, templateInputType[0], function(fields){
		// Show a field for each field that the type provides
		var result = new Array(fields.length);
		var finished = 0;
		for(var i=0;i<fields.length;i++) (function(i){
			var fieldRange = input.db.match(fields[i],"http://www.w3.org/2000/01/rdf-schema#range").map(function(v){return v.object;});
			var inputs = {};
			for(var j=0;j<fieldRange.length;j++) inputs[fieldRange[j]] = fields[j];
			render.render("http://magnode.org/HTMLBody", inputs, function(formatted){
				if(formatted && formatted['http://magnode.org/HTMLBody']){
					result[i] = formatted['http://magnode.org/HTMLBody'];
				}else{
					var label = input.db.match(fields[i],"http://www.w3.org/2000/01/rdf-schema#label")[0];
					var title = (label&&label.object&&label.object.toString()) || fields[i];
					var propertyTypes = input.db.match(fields[i],"http://www.w3.org/1999/02/22-rdf-syntax-ns#type").map(function(v){return v.object;});
					var content = input.db.match(inputResource,fields[i])[0].object.toString();
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
