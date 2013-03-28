var util = require('util');
var rdf = require('rdf');
var ModuleTransform = require('./transform.ModuleTransform');
var NullCache = require('./cache.null');

function Render(db, renders){
	this.db = db;
	this.cache = {};
	if(Array.isArray(renders)){
		this.renders = {};
		for(var i=0;i<renders.length;i++) this.renders[renders[i].URI] = renders[i];
	}else{
		this.renders = renders;
	}
	this.renders[ModuleTransform.URI] = ModuleTransform;
}
module.exports = Render;

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
	return (Array.isArray(x)?x:[x]).map(function(v){return "<"+v+">"}).join(",");
}


/** Calculate the list of transforms to apply to get the desired output type
  * target is allowed to be an Array, in which case the target outputs will be calculated in that order.
  * This behavior can be used to force usage of one intermediate transform over another, when either could otherwise be used.
  */
Render.prototype.resolve = function resolve(target, input, useTransformTypes, depth){
	var db = this.db;
	if(!Array.isArray(target)) target=[target];
	if(!depth) depth=0;
	var s = {input:{}, output:{}, transforms:[]};
	// Make a copy
	if(Array.isArray(input)) for(var i=0; i<input.length; i++) s.output[input[i]]=null;
	else for(var f in input) s.output[f]=null;
	//console.log(pad(depth)+"input="+util.inspect(s,false,1));
	// Handle every target required
	for(var i=0; i<target.length; i++){
		// Generate the target output if it doesn't already exist
		if(s.output.hasOwnProperty(target[i])) continue;
		var transforms = db.match(null, "http://magnode.org/view/range", target[i]).map(function(v){return v.subject});
		//console.log(pad(depth)+"target="+listURI([target[i]])+" transforms:"+listURI(transforms)+" .");
		var solution = null;
		// Go through all the transforms that could provide a result for the asked-for content type
		for(var j=0;j<transforms.length;j++){
			var transform = transforms[j];
			var transformTypes = db.match(transform, rdf.rdfns("type")).map(function(v){return v.object});
			// The transform must be an instance of all the types listed in useTransformTypes
			if(!useTransformTypes.every(function(v){return transformTypes.indexOf(v)!==-1})) continue;
			var transformDomainFirst = db.match(transform, "http://magnode.org/view/domain").map(function(v){return v.object})[0];
			var transformDomain = db.getCollection(transformDomainFirst);
			var transformRange = db.match(transform, "http://magnode.org/view/range").map(function(v){return v.object});
			//console.log(pad(depth)+"* transform[test"+i+"]="+listURI([transform])+" domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
			// Find the transforms for each of the required inputs
			solution = this.resolve(transformDomain, s.output, useTransformTypes, depth+1);
			// Skip this transform if unsuccessful
			if(!solution) continue;
			for(var f in solution.output) s.output[f]=solution.output[f];
			for(var k=0;k<transformDomain.length;k++) s.input[transformDomain[k]]=transform;
			for(var k=0;k<transformRange.length;k++) s.output[transformRange[k]]=transform;
			s.transforms = s.transforms.concat(solution.transforms, transform);
			//console.log(pad(depth)+"Prepending: %j",transform);
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

/** Calculate the list of transforms to apply to get the desired output type
  * target is allowed to be an Array, in which case the target outputs will be calculated in that order.
  * This behavior can be used to force usage of one intermediate transform over another, when either could otherwise be used.
  */
Render.prototype.search = function resolve(target, input, useTransformTypes, depth){
	var db = this.db;
	if(!Array.isArray(target)) target=[target];
	if(typeof depth!=='number') depth=0;
	var s = {input:{}, output:{}, transforms:[]};
	// Make a copy
	if(Array.isArray(input)) for(var i=0; i<input.length; i++) s.output[input[i]]=null;
	else for(var f in input) s.output[f]=null;
	var sList = [s];
	//console.log(pad(depth)+"input="+util.inspect(s,false,1));
	// Handle every target required
	for(var i=0; i<target.length; i++){
		var transforms = db.match(null, "http://magnode.org/view/range", target[i]).map(function(v){return v.subject});
		//console.log(pad(depth)+"target="+listURI([target[i]])+" transforms:"+listURI(transforms)+" .");
		var solutions = [];
		// Go through all the transforms that could provide a result for the asked-for content type
		for(var m=0; m<sList.length; m++){
			var s = sList[m];
			// Generate the target output if it doesn't already exist
			if(Object.prototype.hasOwnProperty.call(s.output, target[i])){
				solutions.push(s);
				continue;
			}
			for(var j=0;j<transforms.length;j++){
				var transform = transforms[j];
				var transformTypes = db.match(transform, rdf.rdfns("type")).map(function(v){return v.object});
				// The transform must be an instance of all the types listed in useTransformTypes
				if(!useTransformTypes.every(function(v){return transformTypes.indexOf(v)!==-1})) continue;
				var transformDomainFirst = db.match(transform, "http://magnode.org/view/domain").map(function(v){return v.object})[0];
				var transformDomain = db.getCollection(transformDomainFirst);
				var transformRange = db.match(transform, "http://magnode.org/view/range").map(function(v){return v.object});
				//console.log(pad(depth)+"* transform[test"+i+"]="+listURI([transform])+" domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
				// Find the transforms for each of the required inputs
				var matches = this.search(transformDomain, s.output, useTransformTypes, depth+1);
				// Skip this transform if unsuccessful
				for(var a=0; a<matches.length; a++){
					var solution = matches[a];
					var sc = {input:{}, output:{}, transforms:[]};
					for(var k in s.input) sc.input[k]=s.input[k];
					for(var k in s.output) sc.output[k]=s.output[k];
					sc.transforms=s.transforms.slice();

					for(var f in solution.output) sc.output[f]=solution.output[f];
					for(var k=0;k<transformDomain.length;k++) sc.input[transformDomain[k]]=transform;
					for(var k=0;k<transformRange.length;k++) sc.output[transformRange[k]]=transform;
					sc.transforms = sc.transforms.concat(solution.transforms, transform);
					//console.log(pad(depth)+"Prepending: %j",transform);
					solutions.push(sc);
				}
				//break;
			}
		}
		// If we couldn't produce an output the entire operation fails
		//if(solution) console.log(pad(depth)+"OUTPUT SUCCESS target="+listURI([target[i]]));
		//else console.log(pad(depth)+"OUTPUT FAIL target="+listURI([target[i]]));
		sList = solutions;
	}
	// We have or can produce all the requested outputs, return success
	//console.log(pad(depth)+"SUCCESS target="+listURI(target));
	return sList;
}

// Which type the resource is of does matter
function getResourceHash(type, value){
	// TODO: Allow some more complex content-types to define their own hash method
	var h=require('crypto').createHash('sha1');
	h.update(type);
	h.update('\0');
	h.update(util.inspect(input[type]));
	var hd = Buffer(h.digest('hex'),'hex');
	//console.log('\t'+transformDomain[i]+':'+hash.toString('hex')+':'+util.inspect(input[transformDomain[i]]));
	//console.log('\t'+transformDomain[i]+': '+hash.toString('hex'));
	return hd;
}

Render.prototype.applyTransform = function applyTransform(transform, input, callback){
	var self = this;
	var db = this.db;
	var renders = this.renders;
	var transformTypes = db.match(transform, rdf.rdfns("type")).map(function(v){return v.object});
	var transformDomain = db.match(transform, "http://magnode.org/view/domain").map(function(v){return v.object});
	var transformRange = db.match(transform, "http://magnode.org/view/range").map(function(v){return v.object});
	var transformCacheable = db.match(transform, "http://magnode.org/view/cache").map(function(v){return v.object})[0];
	//console.log("apply "+listURI([transform])+" a:"+listURI(transformTypes)+"; domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");

	var cache = this.cache[transformCacheable] || new NullCache;

	if(cache.calculateKey){
		// Compute the cache key
		var h=require('crypto').createHash('sha1');
		h.update(transform);
		var hash = Buffer(h.digest('hex'),'hex');

		for(var i=0; i<transformDomain.length; i++){
			var hd = getResourceHash(transformDomain[i], input[transformDomain[i]]);
			for(var i=0; i<hash.length; i++) hash[i] ^= hd[i];
		}
		var hashhex = hash.toString('hex');
	}

	cache.get(hashhex||null, function(result){
		if(result){
			//if(cache.calculateKey) console.log("Cache hit for "+hashhex);
			transformResult(null, result);
			cache.set(hashhex, result);
		}else{
			var transformCall = renders[transform];
			// The transform we're trying might have types that tell us how to process the transform
			// FIXME eventually we could get rid of this
			if(!transformCall) for(var j=0;j<transformTypes.length;j++){
				// This is a way of processing the transform.
				if(!renders[transformTypes[j]]) continue;
				transformCall = renders[transformTypes[j]];
				console.log('Using <%s> for <%s>', transformTypes[j], transform);
				break;
			}
			if(transformCall){
				// Copy the inputs for sub-renders
				//console.log((transformCall.name||"transformCall")+"(db, "+JSON.stringify(transform)+", input, self, callback)");
				transformCall(db, transform, input, self, transformResult);
				return;
			}
			return void callback(new Error('No function to process transform <'+transform+'> found'));
		}
	});

	function transformResult(err, v){
		if(err instanceof Error) return void callback(err);
		else if(v===undefined){ throw new Error('Expected error argument if no return value provided'); }
		for(var m in v){ if(input[m]===undefined) input[m]=v[m]; else throw new Error('Key '+m+' already exists'); }
		callback(null, input);
	}
}

Render.prototype.applyTransforms = function applyTransforms(applyTransforms, input, cb){
	var self=this;
	var transform=applyTransforms.shift();
	//console.log("Transform Apply: "+transform);
	if(transform){
		this.applyTransform(transform, input, function(err, formatted){
			if(err) return void cb(err, formatted);
			//console.log("Transform Apply Result: "+util.inspect(formatted,false,0));
			self.applyTransforms(applyTransforms, formatted, cb);
		});
	}else cb(null, input);
}

/** Perform a render operation transforming an input into content of type target */
Render.prototype.render = function render(target, input, useTransformTypes, callback){
	var self=this;
	if(typeof useTransformTypes=='function'){ callback=useTransformTypes; useTransformTypes=[]; }
	//input.log = function(v){input.response.write(v+"\n");};
	input.log = console.log;
	//console.log("input="+util.inspect(input,false,0));

	var transformSeries = this.resolve(target, input, useTransformTypes);
	//console.log("Apply transforms:", transformSeries);
	if(transformSeries===null){
		callback(new Error('No transform series found for '+listURI(Object.keys(input))+' -> '+listURI(target)));
		return false;
	}

	this.applyTransforms(transformSeries.transforms, input, callback);
}

Render.generate =
	{ "@id":"http://magnode.org/transform/Render_New"
	, domain:"http://magnode.org/Render"
	, range:"http://magnode.org/Render_Instance"
	, arguments:
		[ {type:"http://magnode.org/DBRDF_Instance", inputs:[{subject:"$subject",predicate:"http://magnode.org/db",object:"$result"}]}
		]
	, construct: function(dbrdf){ var renderTypes = [require('./transform.Jade')]; return new Render(dbrdf, renderTypes); }
	};
