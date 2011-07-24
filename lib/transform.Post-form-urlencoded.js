/*
Transform:Post-form-urlencoded
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.Post-form-urlencoded" ;
	view:domain type:HTTPRequest-form-urlencoded ;
	view:range type:FormFieldData .
*/

var querystring=require('querystring');
var util=require("util");

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	var content="";
	request.on("data", function(segment){content += segment;});
	request.on("end", function(){
		callback({"http://magnode.org/FormFieldData":querystring.parse(content)});
	});
}
module.exports.URI = "http://magnode.org/transform/Post-form-urlencoded";
