/** scanModuleTransform database
 * Scan transform.*.js modules in a directory for RDF metadata and populate a database with it
 */
var fs=require('fs');
var rdf=require('rdf');
var dbMemory=require('./db.memory');
var ModuleTransform=require('./transform.ModuleTransform');

module.exports = function(dir){
	this.clear();
	ModuleTransform.scanDirectorySync(dir, this);
}

module.exports.prototype = dbMemory.prototype;

module.exports.generate =
	{ "@id":"http://magnode.org/transform/DBRDFScanModuleTransform_New"
	, domain:"http://magnode.org/DBRDFScanModuleTransform"
	, range:["http://magnode.org/DBRDFN3_Instance","http://magnode.org/DBRDF_Instance"]
	, arguments:
		[ {type:"literal", value:{subject:'$subject',predicate:'http://magnode.org/file',object:'$result'}}
		]
	, construct: function(filename){ return new module.exports(filename.toString()); }
	};
