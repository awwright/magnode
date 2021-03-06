/*
e.g. Transform:SomeTransform
	a view:ModuleTransform, view:PutFormTransform ;
	view:module "magnode/transform.HTMLBodyAuto_typerdfsResource_Form" ;
	view:range type:HTMLBody ;
	view:domain type:ContentType .
*/
var util=require('util');
var url=require('url');
var schema=require('./schema');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

function getTypeString(node){
	if(typeof(node)=="string") return "URI";
	if(!node) return "";
	if(typeof(node.language)=="string") return "@"+node.language;
	if(typeof(node.type)=="string") return node.type;
	return "";
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = input.db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;});
	var templateOutputType = input.db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var templateInverse = input.db.match(transform,"http://magnode.org/view/inverse").map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	schema(input.db, templateInputType[0], function(fields){
		// Show a field for each field that the type provides
		var result = new Array(fields.length);
		var finished = 0;
		fields.forEach(function(field){
			var fieldRange = input.db.match(field,"http://www.w3.org/2000/01/rdf-schema#range").map(function(v){return v.object;});
			var inputs = {};
			for(var j=0;j<fieldRange.length;j++) inputs[fieldRange[j]] = fields[j];
			render.render("http://magnode.org/HTMLBody", inputs, function(formatted){
				if(formatted && formatted['http://magnode.org/HTMLBody']){
					result[i] = formatted['http://magnode.org/HTMLBody'];
				}else{
					var label = input.db.match(field,"http://www.w3.org/2000/01/rdf-schema#label")[0];
					var title = (label&&label.object&&label.object.toString()) || field;
					var propertyTypes = input.db.match(field,"http://www.w3.org/1999/02/22-rdf-syntax-ns#type").map(function(v){return v.object;});
					var content = input.db.match(inputResource,field)[0].object;
					result[i] = "<h3 title=\"a "+propertyTypes.join(",")+"\">"+title+"</h3>"
						//+ "<pre>"+escapeHTML(util.inspect(content))+"</pre>"
						+ "<input type=\"hidden\" name=\"field."+i+".subject\" value=\""+escapeHTMLAttr(input.resource)+"\">"
						+ "<input type=\"hidden\" name=\"field."+i+".field\" value=\""+escapeHTMLAttr(field)+"\">"
						+ "<input type=\"hidden\" name=\"field."+i+".type\" value=\""+getTypeString(content)+"\">"
						+ "<input type=\"text\" style=\"width:100%\" name=\"field."+i+".value\" value=\""+escapeHTMLAttr(content.toString())+"\">";
				}
				finished++;
				if(finished===fields.length){
					// Make a POST request to the same URL
					// we want to edit the content that's being shown as the form, not the original non-form view
					//'&apply='+htmlEscape(templateInverse)
					var action = url.parse(input.request.url, true);
					delete(action.search);
					delete(action.query.edit);
					action.query.apply = ['Transform:Post-form-urlencoded',templateInverse[0]];
					result =
						'<form action="'+escapeHTMLAttr(url.format(action))+'" method="post">'
						+ result.join("")
						+ '<input type="hidden" name="field.length" value="'+escapeHTMLAttr(fields.length)+'"/>'
						+ '<input type="submit" value="Submit"/>'
						+ '</form>';
					var output = {};
					for(var j=0;j<templateOutputType.length;j++){
						output[templateOutputType[j]] = result;
					}
					callback(output);
				}
			});
		});
	});
}
