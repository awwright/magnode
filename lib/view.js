var util = require('util');
var parallel = require('magnode/parallel');
var ModuleTransform = require('magnode/transform.ModuleTransform');

module.exports = function(db, renders){
	this.db = db;
	if(Array.isArray(renders)){
		this.renders = {};
		for(var i=0;i<renders.length;i++) this.renders[renders[i].URI] = renders[i];
	}else{
		this.renders = renders;
	}
	this.renders[ModuleTransform.URI] = ModuleTransform;
}

/*
1. Find each transform that has outputs that match all the return values, and inputs to match all the provided arguments.
	1. Map the provided arguments to the transform’s inputs.
	2. Map the required return values to the transform’s outputs.
	3. Map the remaining transform’s inputs to a sub-render operation that returns the corresponding input type
2. If none are found or successful, return an error.
*/

function pad(n){
	var pad = Buffer(n);
	pad.fill("\t");
	return pad.toString();
}
function listURI(x){
	return x.map(function(v){return "<"+v+">"}).join(",");
}


module.exports.prototype.render = function(target, input, callback){
	var db = this.db;
	var renders = this.renders;
	var self = this;
	//input.log = function(v){input.response.write(v+"\n");};
	input.log = console.log;
	var resourceTypes = db.filter({subject:input.resource, predicate:"rdf:type"}).map(function(v){return v.object});
	input.log("input="+util.inspect(input,false,0));
	for(var i=0;i<resourceTypes.length;i++) input[resourceTypes[i]]=input.resource;
	function transform(target, input, depth, parents, callback){
		if(depth>10){callback({overflow:true});return;}
		var renderFinished=false, renderPending=0, renderFinishedCallback;
		var transforms = db.filter({predicate:"http://magnode.org/view/range",object:target}).map(function(v){return v.subject});
		input.log(pad(depth)+"target="+listURI([target])+" transforms:"+listURI(transforms)+" .");

		// Go through all the transforms that could provide a result for the asked-for content type
		for(var i=0;i<transforms.length;i++){
			var transformTypes = db.filter({subject:transforms[i], predicate:"rdf:type"}).map(function(v){return v.object});
			var transformDomain = db.filter({subject:transforms[i], predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object});
			var transformRange = db.filter({subject:transforms[i], predicate:"http://magnode.org/view/range"}).map(function(v){return v.object});
			input.log(pad(depth)+" - transform"+i+"="+listURI([transforms[i]])+" a:"+listURI(transformTypes)+"; domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
			// The transform we're trying has types that tell us how to process the transform.
			for(var j=0;j<transformTypes.length;j++){
				// This is a way of processing the transform.
				if(renders[transformTypes[j]]) (function(j){
					renderPending++;
					// Copy the inputs for sub-renders
					var childInput = {};
					for(k in input) childInput[k]=input[k];
					// Check to see if the transform we're going to perform requires data that we haven't processed yet
					var requiredInputs = transformDomain;
					var pending=0, endCallback;
					for(var k=0;k<requiredInputs.length;k++){
						input.log(pad(depth)+" - transform"+i+"input"+k+"="+listURI([requiredInputs[i]])+" .");
						// We already know about this content type
						if(input[requiredInputs[k]]) continue;
						// Generate a missing content type
						pending++;
						transform(requiredInputs[k], input, depth+1, parents.concat([transformTypes[j]]), function(v){ // stepCallback
							pending--;
							// The transform might return content types that are more specific than we asked for
							// For every content type that the transform returns, throw it into our inputs if it doesn't already exist
							for(var m in v) if(childInput[m]===undefined) childInput[m]=v[m];
							if(pending===0 && endCallback) endCallback();
						});
					}
					endCallback = function(){ // endCallback
						renderPending--;
						if(renderFinished) return;
						// Process the transform now that we have all the data we need
						var transformCall = renders[transformTypes[j]];
						for(var k=0;k<requiredInputs.length;k++){
							console.log(pad(depth)+"Checking for required input <"+requiredInputs[k]+"> = "+(childInput[requiredInputs[k]]?'true':'false'));
							if(childInput[requiredInputs[k]]) continue;
							// We can't find nothin'
							if(renderPending===0 && renderFinishedCallback) renderFinishedCallback();
							return;
						}
						renderFinished = true;
						transformCall(db, transforms[i], childInput, self, callback);
					};
					if(pending===0 && endCallback) endCallback();
				})(j);
			}
		}
		renderFinishedCallback = function(){
			console.error(pad(depth)+"Couldn't find nothin'");
			renderFinished = true;
			callback({});
		}
		if(renderPending===0 && renderFinishedCallback && renderFinished==false) renderFinishedCallback();
	}
	transform(target, input, 0, [], callback);
	return;
}
