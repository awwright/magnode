

var resolvePath=require('path').resolve;
var cwd = process.cwd();
var ModuleTransform = require('./transform.ModuleTransform');

module.exports.scanDirectory = function(dir, render, cb){
}

module.exports.scanDirectorySync = function(dir, render){
	var turtleParser = new (require('rdf/TurtleParser').Turtle)();
	var header = '@prefix Transform: <http://magnode.org/transform/> .\n@prefix view: <http://magnode.org/view/> .\n@prefix type: <http://magnode.org/> .\n';

	// Go through directory, return RDF facts about ModuleTransform transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles = require('fs').readdirSync(dir);
	var files = [];
	for(var i=0; i<readdirFiles.length; i++){
		var path = resolvePath(cwd, dir, readdirFiles[i]);
		if(!readdirFiles[i].match(/^transform\./)) continue;

		var contents = require('fs').readFileSync(path).toString().match(/(^|\n)((Transform\:.*)((\n)\s+.*)*\.).*(\n|$)/);
		if(contents&&contents[2]&&contents[3]){
			var turtle = contents[2]+"\n";
			var URI = contents[3].replace(/^Transform:/,'http://magnode.org/transform/');
			//console.log(path+":\n"+header+turtle);
			turtleParser.parse(header+turtle, undefined, undefined, undefined, render.db);
			render.renders[URI]=ModuleTransform;
			continue;
		}

		var module = require(path);
		if(module.about){
			files.push(module.about);
			continue;
		}
	}
	return files;
}
