var util = require('util');
var ModuleTransform = require('./transform.ModuleTransform');

module.exports = function(db, renders){
	this.db = db;
	this.cache = null;
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
	1. Map the provided arguments to the transform's inputs.
	2. Map the required return values to the transform's outputs.
	3. Map the remaining transform inputs to a sub-render operation that returns the corresponding input type
2. If none are found or successful, return an error.
*/

/** Return an n length string of tab characters */
function pad(n, c){
	var pad = Buffer(n);
	pad.fill(c||"\t");
	return pad.toString();
}

/** Print out an Array of URIs */
function listURI(x){
	return x.map(function(v){return "<"+v+">"}).join(",");
}

module.exports.prototype.resolve = function(target, input, useTransformTypes, parentTransforms, depth){
	var db = this.db;
	if(!Array.isArray(target)) target=[target];
	if(!parentTransforms) parentTransforms=[];
	if(!depth) depth=0;
	var s = {input:{}, output:{}, transforms:parentTransforms.concat([])};
	// Make a copy
	if(Array.isArray(input)) for(var i=0; i<input.length; i++) s.output[input[i]]=null;
	else for(var f in input) s.output[f]=null;
	//console.log(pad(depth)+"input="+util.inspect(s,false,1));
	// Handle every target required
	for(var i=0; i<target.length; i++){
		// Generate the target output if it doesn't already exist
		if(s.output.hasOwnProperty(target[i])) continue;
		var transforms = db.filter({predicate:"http://magnode.org/view/range",object:target[i]}).map(function(v){return v.subject});
		//console.log(pad(depth)+"target="+listURI([target[i]])+" transforms:"+listURI(transforms)+" .");
		var solution = null;
		// Go through all the transforms that could provide a result for the asked-for content type
		for(var j=0;j<transforms.length;j++){
			var transformTypes = db.filter({subject:transforms[j], predicate:"rdf:type"}).map(function(v){return v.object});
			var transformDomain = db.filter({subject:transforms[j], predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object});
			var transformRange = db.filter({subject:transforms[j], predicate:"http://magnode.org/view/range"}).map(function(v){return v.object});
			// The transform must be an instance of all the types listed in useTransformTypes
			if(!useTransformTypes.every(function(v){return transformTypes.indexOf(v)!==-1})) continue;
			//console.log(pad(depth)+" - transform[test"+i+"]="+listURI([transforms[j]])+" a:"+listURI(transformTypes)+"; domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
			// Find the transforms for each of the required inputs
			solution = this.resolve(transformDomain, s.output, useTransformTypes, [].concat(transforms[j], s.transforms), depth+1);
			// Skip this transform if unsuccessful
			if(!solution) continue;
			for(var f in solution.output) s.output[f]=null;
			for(var k=0;k<transformDomain.length;k++) s.input[transformDomain[k]]=null;
			for(var k=0;k<transformRange.length;k++) s.output[transformRange[k]]=null;
			s.transforms = solution.transforms;
			//console.log(pad(depth)+"Prepending: %j",transforms[j]);
			break;
		}
		// If we couldn't produce an output the entire operation fails
		//if(solution) console.log(pad(depth)+"OUTPUT SUCCESS target="+listURI([target[i]]));
		//else console.log(pad(depth)+"OUTPUT FAIL target="+listURI([target[i]]));
		if(!solution) return null;
	}
	// We have or can produce all the requested outputs, return success
	//console.log(pad(depth)+"SUCCESS target="+listURI(target));
	return s;
}

module.exports.prototype.applyTransform = function(transform, input, callback){
	var self = this;
	var db = this.db;
	var renders = this.renders;
	var transformTypes = db.filter({subject:transform, predicate:"rdf:type"}).map(function(v){return v.object});
	var transformDomain = db.filter({subject:transform, predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object});
	var transformRange = db.filter({subject:transform, predicate:"http://magnode.org/view/range"}).map(function(v){return v.object});
	//console.log("apply "+listURI([transform])+" a:"+listURI(transformTypes)+"; domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
	// The transform we're trying has types that tell us how to process the transform.
	var renderPending = 0;
	for(var j=0;j<transformTypes.length;j++){
		// This is a way of processing the transform.
		if(!renders[transformTypes[j]]) continue;
		renderPending++;
		// Copy the inputs for sub-renders
		var childInput = {};
		var transformCall = renders[transformTypes[j]];
		//console.log((transformCall.name||"transformCall")+"(db, "+JSON.stringify(transform)+", input, self, callback)");
		transformCall(db, transform, input, self, function(err, v){
			if(err instanceof Error) return callback(err);
			else if(!v){ v=err; err=null; }
			var childInput = {};
			for(k in input) childInput[k]=input[k];
			for(var m in v) if(childInput[m]===undefined) childInput[m]=v[m];
			callback(null, childInput);
		});
		return;
	}
	throw new Error('No function to process transform <'+transform+'> found');
	callback({});
}

module.exports.prototype.applyTransforms = function(applyTransforms, input, cb){
	var self=this;
	var transform=applyTransforms.shift();
	//console.log("Transform Apply: "+transform);
	if(transform){
		this.applyTransform(transform, input, function(err, formatted){
			if(err) return cb(err, formatted);
			//console.log("Transform Apply Result: "+util.inspect(formatted,false,0));
			self.applyTransforms(applyTransforms, formatted, cb);
		});
	}else cb(null, input);
}

/** Perform a render operation transforming an input into content of type target */
module.exports.prototype.render = function(target, input, useTransformTypes, callback){
	var self=this;
	if(typeof(useTransformTypes)=="function"){ callback=useTransformTypes; useTransformTypes=[]; }
	//input.log = function(v){input.response.write(v+"\n");};
	input.log = console.log;
	//console.log("input="+util.inspect(input,false,0));

	var transformSeries = this.resolve(target, input, useTransformTypes);
	//console.log("Apply transforms: %j", transformSeries);
	if(transformSeries===null){
		callback(null);
		return false;
	}
	if(this.cache){
		var domain = Object.keys(transformSeries.input).sort();
		var values = {};
		for(var i=0; i<domain.length; i++){
			values[domain[i]]=input[domain[i]].toString();
		}
		var key = JSON.stringify(values);
		//console.log('DOMAIN='+JSON.stringify(key));
		//console.log('CACHE[D]='+util.inspect(this.cache[key],true,2,true));
		if(this.cache[key]) callback(self.cache[key]);
		else this.applyTransforms(transformSeries.transforms, input, function(err, out){if(!err) self.cache[key]=out; callback(err, out);});
	}else{
		this.applyTransforms(transformSeries.transforms, input, callback);
	}
}

module.exports.generate =
	{ "@id":"http://magnode.org/transform/Render_New"
	, domain:"http://magnode.org/Render"
	, range:"http://magnode.org/Render_Instance"
	, arguments:
		[ {type:"http://magnode.org/DBRDF_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		]
	, construct: function(dbrdf){ var renderTypes = [require('./transform.Jade')]; return new module.exports(dbrdf, renderTypes); }
	};
