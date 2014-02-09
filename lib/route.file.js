
/** Render a file stored on the filesystem
 *
 * Different than the static router - this produces a resource and variant subset instead of a direct HTTP response
 * 
 * Filenames follow the form of:
 * /path/to/file[.type]
 *
 * Usage:
 * (magnode.require("route.file"))(route, resources, renders, __dirname+'/htdocs/', '/');
 */

var uriParse = require('url').parse;
var uriResolve = require('url').resolve;
var fs = require('fs');

var rdf=require('rdf');
var ObjectId=require('mongodb').ObjectID;

var Render = require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var queryVariant = require('./queryvariant').parseUriVariants;

// TODO: Add an "index" option to optionally handle requests on a directory
// TODO: Add a "autoindex" option to enable/disable production of the DirectoryList resource
// FIXME: Loading a directory without a trailing / should redirect to the URI with the trailing /
// FIXME: Directories in directory listings should have a trailing /
module.exports = function registerHandler(route, resources, render, opts){
	if(!render instanceof Render) throw new Error('view not an instanceof render object');
	var siteBase = resources.rdf&&resources.rdf.prefixes[''] || "";
	var sourceExtensions = Array.isArray(opts.sourceExtensions) ? opts.sourceExtensions : [opts.sourceExtensions];
	var extensionMap = opts.extensionMap;
	var basePrefix = uriResolve(siteBase, opts.base||'/');

	function routeResource(resource, callback){
		var result = Object.create(opts.type) || {};
		var urlArgs = uriParse(resource, true);
		if(resource.substr(0, basePrefix.length)!==basePrefix) return void callback(null);
		var resourceName = resource.split('?',1)[0];

		// Don't read hidden files or navigate about directories
		if(urlArgs.pathname[0]!=='/' || resourceName.indexOf('/.')>=0) return void callback(null);

		var ext = resourceName.match(/\.([a-zA-Z0-9]+)$/);
		var type = ext && extensionMap[ext[1]];

		// 1. Determine the non-information resource URI (for the "about" link)
		if(type){
			// If there is a registered `type` then check if there's an underlying file
			var nirUri = resourceName.replace(/\.([a-zA-Z0-9]+)$/, '');
		}else{
			// If no `type` then this identifies a content-negotiation resource,
			// append the srcExt to find the underlying information resource
			var nirUri = resourceName;
		}

		var reqFile = opts.root + resourceName.substring(basePrefix.length);

		// 3. Determine the variant subset from requested resource URI

		// 4. Determine the generated variant URI
		// We'll just do this later

		// Stat the requested file to see if it's a directory,
		// Then stat the extension name replaced files to see if they exist
		fs.stat(reqFile, function(err, stat){
			if(stat && stat.isDirectory()){
				fs.readdir(reqFile, function resourceContentsDirectory(err, contents){
					if(err || !contents) return void callback(err);
					var variant = queryVariant(resource);
					result['http://magnode.org/DirectoryList'] = contents.map(function(v){
						var fExt = v.match(/\.([a-zA-Z0-9]+)$/);
						var fMatch = fExt && sourceExtensions.indexOf(fExt[1]);
						if(typeof fMatch=='number' && fMatch>=0) return v.substring(0, v.length-fExt[0].length);
						return v;
					});
					result['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
					result.variant = variant;
					callback(null, result);
				});
			}else{
				statNextFile(0);
			}
		});

		function statNextFile(i){
			// 2. Determine the underlying file URI (e.g. append ".md")
			var srcExt = sourceExtensions[i];
			if(srcExt===undefined) return void callback();
			var srcFile = opts.root + nirUri.substring(basePrefix.length) + '.' + srcExt;
			fs.readFile(srcFile, function(err, contents){
				// If the file doesn't exist, try the next one
				if(err) return void statNextFile(i+1);
				var srcType = extensionMap[srcExt];
				var variant = queryVariant(resource);
				// The filename extension overrides what is provided in the query string
				if(type) variant.type = type;
				variant.resource = resourceName.replace(/\.([a-zA-Z0-9]+)$/, '');
				result[srcType] = contents.toString();
				result['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
				result.variant = variant;
				callback(null, result);
			});
		}
	}
	route.push(routeResource);
}
