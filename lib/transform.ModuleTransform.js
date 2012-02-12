/*
Load the module provided by the view:module property.

e.g.
Transform:HTTP
	a view:ModuleTransform, view:Transform, view:FormTransform, view:ViewTransform, view:PostTransform ;
	view:module "magnode/transform.HTTP" ;
	view:domain type:Document ;
	view:range type:HTTPResponse .
*/
module.exports = function(db, transform, input, render, callback){
	var module = db.filter({subject:transform,predicate:"http://magnode.org/view/module"});
	if(module[0]&&module[0].object){
		module = module[0].object.toString();
		if(input.log){
			//input.log("ModuleTransform: Transform "+transform+" run "+module+"("+util.inspect(input,false,0)+")");
		}
		var method = require(module);
		method(db, transform, input, render, callback);
	}else{
		console.error("ModuleTransform: No module to call");
		callback({});
	}
}
module.exports.URI = "http://magnode.org/view/ModuleTransform";
module.exports.about =
	{ '@id': 'http://magnode.org/view/ModuleTransform'
	, a: ['view:ModuleTransform', 'view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	, 'view:module': {value:'magnode/transform.HTTP'}
	, 'view:domain': 'type:Document'
	, 'view:range': 'type:HTTPResponse'
	};

module.exports.scanDirectory = function(dir, db, cb){
}

module.exports.scanDirectorySync = function(dir, db){
	var turtleParser = new (require('rdf/TurtleParser').Turtle)();
	var header = '@prefix Transform: <http://magnode.org/transform/> .\n@prefix view: <http://magnode.org/view/> .\n@prefix type: <http://magnode.org/> .\n';

	// Go through directory, return RDF facts about ModuleTransform transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles = require('fs').readdirSync(dir);
	var files = [];
	for(var i=0; i<readdirFiles.length; i++){
		var path = dir+'/'+readdirFiles[i];
		if(!readdirFiles[i].match(/^transform\./)) continue;

		var contents = require('fs').readFileSync(path).toString().match(/(^|\n)(Transform\:.*((\n)\s+.*)*\.).*(\n|$)/);;
		if(contents&&contents[2]){
			var turtle = contents[2]+"\n";
			//console.log(path+":\n"+header+turtle);
			turtleParser.parse(header+turtle, undefined, undefined, db);
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
