var resolvePath=require('path').resolve;
var cwd = process.cwd();
var rdf=require('rdf');

module.exports.scanDirectorySync = function(dir, render){
	var environment = new rdf.RDFEnvironment();
	environment.setPrefix('Transform', 'http://magnode.org/transform/');
	environment.setPrefix('view', 'http://magnode.org/view/');
	environment.setPrefix('type', 'http://magnode.org/');

	// Go through directory, return RDF facts about transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles = require('fs').readdirSync(dir);
	var files = [];
	for(var i=0; i<readdirFiles.length; i++){
		var path = resolvePath(cwd, dir, readdirFiles[i]);
		if(!readdirFiles[i].match(/^transform\./)) continue;
		var module = require(path);
		if(typeof module === 'function' && module.about){
			console.log('Import module <file://'+path+'>');
			render.add(module);
		}
	}
}
