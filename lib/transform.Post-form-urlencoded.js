/*
Transform:Post-form-urlencoded
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.Post-form-urlencoded" ;
	view:domain type:HTTPRequest-form-urlencoded, type:requestDataBuffer ;
	view:range type:FormFieldData .
*/

var querystring=require('querystring');
var util=require("util");

module.exports = function(db, transform, input, render, callback){
	var request=input.request;
	function end(){
		callback({"http://magnode.org/FormFieldData":querystring.parse(input.requestDataBuffer)});
	}
	if(!request.readable){
		if(input.requestDataBuffer===undefined) throw new Error("Request data undefined on a closed socket");
		end();
	}
	request.on("end", end);
}
module.exports.URI = "http://magnode.org/transform/Post-form-urlencoded";
