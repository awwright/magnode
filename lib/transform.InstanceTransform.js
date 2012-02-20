/*
Create a resource -> instance transform from Function metadata
*/

var rdf=require('rdf');
var rdf$type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

module.exports = function(db, transform, input, render, callback){
	var method = module.exports.functions[transform];
	if(method){
		method(db, transform, input, render, callback);
	}else{
		console.error("ModuleTransform: No module to call");
		callback({});
	}
}
module.exports.URI = "http://magnode.org/view/InstanceTransform";

module.exports.functions = [];

module.exports.scanDirectory = function(dir, db, cb){
}

module.exports.scanDirectorySync = function(dir, db){
	// Go through directory, return RDF facts about ModuleTransform transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles = require('fs').readdirSync(dir);
	var files = [];
	for(var i=0; i<readdirFiles.length; i++){
		var path = dir+'/'+readdirFiles[i];
		if(!readdirFiles[i].match(/^transform\./)) continue;
		// TODO parse file
	}
	return files;
}

module.exports.createTransform = function(m){
	var domain = m.generate.domain;
	var range = m.generate.range || domain+"_Instance";
	if(!Array.isArray(range)) range=[range];
	var args = m.generate.arguments;
	var construct = m.generate.construct;
	function queryTriple(db, pattern, subject){
		var searchTriple = {};
		var resultNode = null;
		['subject','predicate','object'].forEach(function(f){
			if(typeof pattern[f]=='function'){
				searchTriple[f]=pattern[f](input);
			}else switch(pattern[f]){
				case '$result': resultNode=f; break;
				case '$subject': searchTriple[f]=subject; break;
				default: searchTriple[f]=pattern[f]; break;
			}
		});
		var q = db.filter(searchTriple).map(function(v){return v[resultNode]});
		if(!q.length) throw new Error(m.generate['@id']+' cannot match for '+JSON.stringify(searchTriple));
		return q;
	}
	var transform = function(db, transform, input, render, callback){
		var subject = input[domain];
		var rendersRemaining = 1;
		var renderResults = {};
		var instanceArgs = new Array(args.length);
		args.forEach(function(arg, i){
			if(arg.type=="literal"){
				try{
					instanceArgs[i] = queryTriple(input.db, arg.value, subject)[0];
				}catch(e){
					instanceArgs[i] = arg.default;
				}
			}else if(arg.type=="db"){
				instanceArgs[i] = db;
			}else if(arg.type=="array"){
				var list = queryTriple(input.db, arg.value.input, subject);
				instanceArgs[i] = new Array(list.length);
				list.forEach(function(result, j){
					rendersRemaining++;
					var resources = { db: input.db };
					var resourceTypes = db.filter({subject:result, predicate:rdf$type}).map(function(v){return v.object});
					for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=result;
					render.render(arg.value.type, resources, arg.transformType||[], function(r){
						rendersRemaining--;
						if(!r) throw new Exception('Could not create resource');
						// Don't rely on the data order, but this might be useful for debugging
						instanceArgs[i][j] = r[arg.value.type];
						if(rendersRemaining===0 && rendersFinished) rendersFinished();
					});
				});
			}else{
				rendersRemaining++;
				instanceArgs[i] = null;
				var resources = { db: input.db };
				for(var j=0; j<arg.inputs.length; j++){
					var result = queryTriple(input.db, arg.inputs[j], subject)[0];
					var resourceTypes = db.filter({subject:result, predicate:rdf$type}).map(function(v){return v.object});
					for(var j=0;j<resourceTypes.length;j++) resources[resourceTypes[j]]=result;
				}
				render.render(arg.type, resources, arg.transformType||[], function(r){
					rendersRemaining--;
					if(!r) throw new Exception('Could not create resource');
					instanceArgs[i] = renderResults[arg.type] = r[arg.type];
					if(rendersRemaining===0 && rendersFinished) rendersFinished();
				});
			}
		});
		function rendersFinished(){
			rendersRemaining = false;
			var out = {};
			var instance = construct.apply(this, instanceArgs);
			range.forEach(function(v){out[v]=instance;});
			// TODO if more advanced queries are needed, we can pass the database object and let the generate function handle it.
			// Or just implement the transform function from scratch.
			callback(out);
		}
		if(--rendersRemaining===0) rendersFinished();
	}
	transform.URI = m.generate['@id'];
	transform.about =
		[ new rdf.Triple(transform.URI, rdf$type, 'http://magnode.org/view/InstanceTransform')
		, new rdf.Triple(transform.URI, 'http://magnode.org/view/domain', domain)
		];
	range.forEach(function(v){transform.about.push(new rdf.Triple(transform.URI, 'http://magnode.org/view/range', v));});
	module.exports.functions[transform.URI] = transform;
	return transform;
}
