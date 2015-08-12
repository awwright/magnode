var util = require('util');
var rdf = require('rdf');
var ModuleTransform = require('./transform.ModuleTransform');
var NullCache = require('./cache.null');

function Render(db, renders){
	this.db = db || rdf.environment.createGraph();
	this.cache = {};
	if(Array.isArray(renders)){
		this.renders = {};
		for(var i=0;i<renders.length;i++) this.renders[renders[i].URI] = renders[i];
	}else{
		this.renders = renders || {};
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

/** Determine if a resource of types `a` is an instance of type `b` following subClassOf */
function getSubClasses(db, a){
	var list = {};
	var subClassOf = rdf.environment.createNamedNode(rdf.rdfsns('subClassOf'));
	a = a.slice();
	for(var i=0; i<a.length; i++){
		list[a[i]] = a[i];
		db.match(a[i], subClassOf).forEach(function(w){
			var n = w.object;
			if(n in list) return;
			list[n] = n;
			a.push(n);
		});
	}
	return Object.keys(list).map(function(n){ return list[n]; });
}

function cloneSolution(s){
	var sc = {input:{}, output:{}, transforms:[], nice:0};
	for(var k in s.input) sc.input[k]=s.input[k];
	for(var k in s.output) sc.output[k]=s.output[k];
	sc.transforms = s.transforms.slice();
	sc.nice = s.nice;
	return sc;
}

/** Calculate the list of transforms to apply to get the desired output type
  * target is allowed to be an Array, in which case the target outputs will be calculated in that order.
  * This behavior can be used to force usage of one intermediate transform over another, when either could otherwise be used.
  */
Render.prototype.resolve = function resolve(target, input, useTransformTypes, depth){
	var db = this.db;
	if(!Array.isArray(target)) target=[target];
	if(!depth) depth=0;
	// TODO make depth an array of transforms, ignore loops that run the same transform twice, or throw an Error
	if(depth>84) throw new RangeError('RangeError: Render#resolve: Went too deep');
	var s = {input:{}, output:{}, transforms:[]};
	// Make a copy
	if(Array.isArray(input)) for(var i=0; i<input.length; i++) s.output[input[i]]=null;
	else for(var f in input) s.output[f]=null;
	//console.log(pad(depth)+"input="+util.inspect(s,false,1));
	// Handle every target required
	for(var i=0; i<target.length; i++){
		// Generate the target output if it doesn't already exist
		if(target[i] in s.output) continue;
		var transforms = db.match(null, "http://magnode.org/view/range", target[i]).map(function(v){return v.subject.toString()});
		//console.log(pad(depth)+"target="+listURI([target[i]])+" transforms:"+listURI(transforms)+" .");
		var solution = null;
		// Go through all the transforms that could provide a result for the asked-for content type
		for(var j=0;j<transforms.length;j++){
			var transform = transforms[j];
			var transformTypes = getSubClasses(db, db.match(transform, rdf.rdfns("type")).map(function(v){return v.object})).map(function(v){return v.toString();});
			// The transform must be an instance of all the types listed in useTransformTypes
			if(!useTransformTypes.every(function(v){return transformTypes.indexOf(v+'')!==-1})) continue;
			var transformDomainFirst = db.match(transform, "http://magnode.org/view/domain").map(function(v){return v.object.toString()})[0];
			var transformDomain = db.getCollection(transformDomainFirst);
			var transformRange = db.match(transform, "http://magnode.org/view/range").map(function(v){return v.object.toString()});
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
	var render = this;
	var db = this.db;
	if(!Array.isArray(target)) target=[target];
	if(typeof depth!=='number') depth=0;
	if(depth>84) throw new RangeError('RangeError: Render#search: Went too deep');
	var s = {input:{}, output:{}, transforms:[], nice:0};
	// Make a copy
	if(Array.isArray(input)) for(var i=0; i<input.length; i++) s.output[input[i]]=null;
	else for(var f in input) s.output[f]=null;
	var sList = [s];
	//console.log(pad(depth)+"input="+util.inspect(s,false,1));
	// Search for transforms that produce these targets
	for(var i=0; i<target.length; i++){
		var transforms = db.match(null, "http://magnode.org/view/range", target[i]).map(function(v){return v.subject.toString()});
		//console.log(pad(depth)+"target="+listURI([target[i]])+" transforms:"+listURI(transforms)+" .");
		var solutions = [];
		// For every solution we've found so far, ensure we have all the required inputs
		for(var m=0; m<sList.length; m++){
			var s = sList[m];
			// If the required target already exists in this solution, copy it to the result
			if(target[i] in s.output){
				solutions.push(s);
				continue;
			}
			// Iterate through transforms that would provide the required target for this solution
			for(var j=0;j<transforms.length;j++){
				var transform = transforms[j];
				var transformTypes = getSubClasses(db, db.match(transform, rdf.rdfns("type")).map(function(v){return v.object})).map(function(v){return v.toString();});
				// The transform must be an instance of all the types listed in useTransformTypes
				if(!useTransformTypes.every(function(v){return transformTypes.indexOf(v+'')!==-1})) continue;
				var transformDomainFirst = db.match(transform, "http://magnode.org/view/domain").map(function(v){return v.object.toString()})[0];
				var transformDomain = db.getCollection(transformDomainFirst);
				var transformOptional = db.match(transform, "http://magnode.org/view/optional").map(function(v){return v.object.toString()});
				var transformRange = db.match(transform, "http://magnode.org/view/range").map(function(v){return v.object.toString()});
				var transformNice = parseFloat(db.match(transform, "http://magnode.org/view/nice").map(function(v){return v.object.valueOf()})[0]) || 0;
				//console.log(pad(depth)+"* transform[test"+i+"]="+listURI([transform])+" domain:"+listURI(transformDomain)+"; range:"+listURI(transformRange)+" .");
				// Ensure that applying this transform won't overwrite a previously generated variant
				if(transformRange.some(function(v){ return (v in s.output); })){
					continue;
				}
				// Find the transforms for each of the required inputs
				var matches = render.search(transformDomain, s.output, useTransformTypes, depth+1);
				// Add a solution for every match (skipping this branch entirely if no results)
				for(var a=0; a<matches.length; a++){
					var solution = matches[a];
					var sc = cloneSolution(s);
					for(var k in solution.output) sc.output[k]=solution.output[k];
					for(var k=0;k<transformDomain.length;k++) sc.input[transformDomain[k]]=transform;
					for(var k=0;k<transformRange.length;k++) sc.output[transformRange[k]]=transform;
					sc.transforms = sc.transforms.concat(solution.transforms);
					sc.nice += solution.nice + transformNice;
					//console.log(pad(depth)+"Prepending: %j",transform);
					var domainSolutions = [sc];

					// If "optional" inputs are specified, try and generate them IF that's possible
					transformOptional.forEach(function(desired){
						var solutionsOptional = [];
						domainSolutions.forEach(function(dsc){
							var matches = render.search([desired], dsc.output, useTransformTypes, depth+1);
							matches.forEach(function(solutioo){
								var scc = cloneSolution(dsc); // Solution-Clone-Clone
								for(var k in solutioo.output) scc.output[k]=solutioo.output[k];
								scc.transforms = scc.transforms.concat(solutioo.transforms);
								scc.nice += solutioo.nice;
								solutionsOptional.push(scc);
							});
						});
						if(solutionsOptional.length){
							domainSolutions = solutionsOptional;
						}
					});
					domainSolutions.forEach(function(v){
						v.transforms.push(transform);
						solutions.push(v);
					});
				}
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

/* Start with the input and calculate all the outputs that we can possibly create by combining transforms */
Render.prototype.range = function range(input, useTransformTypes, depth){
	var db = this.db;
	var usedTransforms = {};
	var availableResourceTypes = {};
	for(var k in input) availableResourceTypes[k] = null;
	// Find ?transform from this query: { ?input ^first/^rest*/^view:domain ?transform . }
	// Or, let's just go through all the transforms and cache their domain
	var transformDomains = {};
	var validTransforms = db.match(null, rdf.rdfns("type"), 'http://magnode.org/view/Transform').map(function(v){ return v.subject; });
	validTransforms.forEach(function(t){
		// TODO ensure that v.subject is an instance of every member of useTransformTypes
		var domainFirst = db.match(t, 'http://magnode.org/view/domain').map(function(v){ return v.object; });
		// An error will occur here if the transform domain is unknown (i.e. missing required property view:domain)
		transformDomains[t] = db.getCollection(domainFirst[0]);
	});
	while(1){
		var applied = validTransforms.some(function(t){
			// Only apply a transform once
			if(t in usedTransforms) return;
			// If every domain in a transform exists in our available pool, apply it to the pool
			var found = transformDomains[t].every(function(v){ return (v in availableResourceTypes); });
			if(!found) return;
			usedTransforms[t] = null;
			db.match(t, 'http://magnode.org/view/range').forEach(function(v){
				availableResourceTypes[v.object] = t;
			});
			return true;
		});
		if(!applied) return availableResourceTypes;
	}
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
	var callbackCalls = 0;
	var renders = this.renders;
	var transformTypes = getSubClasses(db, db.match(transform, rdf.rdfns("type")).map(function(v){return v.object}));
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

	function transformResult(err, map){
		if(++callbackCalls>1){
			console.error('Transform <'+transform+'> finished more than once');
			throw new Error('Transform <'+transform+'> finished more than once');
		}
		if(err) return void callback(err);
		for(var i=0; i<transformRange.length; i++){
			if(!(transformRange[i] in map)) return void callback(new Error('Transform <'+transform+'> did not define expected resource <'+transformRange[i]+'>'));
		}
		// The function can define variants in addition to the ones specified in its range. Iterate through all of them here.
		for(var m in map){
			if(m==='__proto__') continue; // this is an overloaded (evil) key name in many ECMAScript implementations, avoid
			if(input[m]===undefined) input[m]=map[m];
			else return void callback(new Error('Transform <'+transform+'> defines duplicate resource <'+m+'>'));
		}
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

Render.prototype.add = function add(fn, meta){
	// Maybe (meta || fn.renderAbout || fn.about)
	var m = meta || fn.about;
	var uri = m.id || fn.URI;
	this.renders[uri] = fn;
	var db = this.db;
	// FIXME just use `m` as-is if it already looks like a JSON-LD object
	var about = {'@context': {view:'http://magnode.org/view/', type:'http://magnode.org/'}};
	about['a'] = ['http://magnode.org/view/Transform'].concat(m.type || m.a || []);
	about['http://magnode.org/view/domain'] = m['view:domain'] || {$list: m.domain};
	about['http://magnode.org/view/optional'] = m['view:optional'] || m.optional;
	about['http://magnode.org/view/range'] = m['view:range'] || m.range;
	about['http://magnode.org/view/nice'] = m['view:nice'] || m.nice;
	rdf.ref.call(about, uri).graphify().forEach(function(t){db.add(t);});
	//console.log(rdf.ref.call(about, uri).graphify().toArray());
}
