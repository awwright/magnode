var resolvePath=require('path').resolve;
var fs=require('fs');
var cwd = process.cwd();
var rdf=require('rdf');
var turtleParse = rdf.TurtleParser

module.exports.scanDirectorySync = function(dir, render){
	var environment = new rdf.RDFEnvironment();
	environment.setPrefix('Transform', 'http://magnode.org/transform/');
	environment.setPrefix('view', 'http://magnode.org/view/');
	environment.setPrefix('type', 'http://magnode.org/');

	// Go through directory, return RDF facts about transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles;
	if(fs.statSync(dir).isDirectory()){
		readdirFiles = fs.readdirSync(dir);
	}else{
		readdirFiles = [dir];
		dir = '.';
	}
	for(var i=0; i<readdirFiles.length; i++){
		var path = resolvePath(cwd, dir, readdirFiles[i]);
		if(!readdirFiles[i].match(/\.ttl$/)) continue;
		var contents = fs.readFileSync(path, 'utf8');
		var base = 'file://'+path;
		var parser = new rdf.TurtleParser(environment);
		var graph = new rdf.environment.createGraph();
		parser.parse(contents, undefined, base, undefined, graph);
		render.db.importArray(graph.toArray());
		var matches = graph.match(null, rdf.rdfns('type'), 'http://magnode.org/view/Transform');
		matches.forEach(function(m){
			var types = graph.match(m.subject, rdf.rdfns('type')).map(function(v){return v.object;});
			var mFunc;
			types.some(function(t){ if(render.renders[t]){ mFunc=t; return true; } });
			if(mFunc){
				render.renders[m.subject]=render.renders[mFunc];
			}else{
				throw new Error('No transform function found for '+m.subject.toNT()+' types='+types.map(function(v){return v.toNT()}));
			}
		});
	}
}
