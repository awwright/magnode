var resolvePath=require('path').resolve;
var fs=require('fs');
var cwd = process.cwd();
var rdf=require('rdf');
var turtleParse = rdf.TurtleParser

module.exports.scanDirectorySync = function(dir, render){
	// Go through directory, return RDF facts about transforms within it
	// Searching in this manner is rather arbitrary but it works
	var readdirFiles = fs.readdirSync(dir);
	for(var i=0; i<readdirFiles.length; i++){
		if(!readdirFiles[i].match(/\.ttl$/)) continue;
		scanFileSync(resolvePath(cwd, dir, readdirFiles[i]), render);
	}
}

module.exports.scanFileSync = scanFileSync;
function scanFileSync(path, render){
	var contents = fs.readFileSync(path, 'utf8');
	var base = 'file://'+path;
	var parser = new rdf.TurtleParser();
	var graph = rdf.environment.createGraph();
	parser.parse(contents, undefined, base, undefined, graph);
	render.db.importArray(graph.toArray());
	var matches = graph.match(null, rdf.rdfns('type'), 'http://magnode.org/view/Transform');
}
