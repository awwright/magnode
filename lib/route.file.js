
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

module.exports = function registerHandler(route, resources, render, root, base){
	if(!render instanceof Render) throw new Error('view not an instanceof render object');
	var siteBase = resources.rdf&&resources.rdf.prefixes[''] || "";
	var basePrefix = uriResolve(siteBase, base||'/');

	// TODO make this an argument or configurable or something
	// sourceExtensions will take an incoming filename and look for
	// variants in all the following extensions
	var sourceExtensions = 'md';
	// extensionMap defines the particular variant to produce depending
	// on incoming filename extension
	var extensionMap =
		{ css: 'media:text/css'
		, js: 'media:application/ecmascript'
		, html: 'media:text/html;charset=utf-8'
		, less: 'media:text/less'
		, markdown: 'media:text/markdown'
		, md: 'media:text/markdown'
		};

	function routeResource(resource, callback){
		// Code if there's a request
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
		
		// 2. Determine the underlying file URI (e.g. append ".md")
		var srcExt = sourceExtensions;
		var srcType = extensionMap[srcExt];
		var srcFile = root + nirUri.substring(basePrefix.length) + '.' + srcExt;

		// 3. Determine the variant subset from requested resource URI
		
		// 4. Determine the generated variant URI
		// We'll just do this later

		fs.readFile(srcFile, function(err, contents){
			if(err || !contents) return void callback(null);
			var variant = queryVariant(resource);
			// The filename extension overrides what is provided in the query string
			if(type) variant.type = type;
			variant.resource = resourceName.replace(/\.([a-zA-Z0-9]+)$/, '');
			var data = {};
			data[srcType] = contents.toString();
			data['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
			data.variant = variant;
			callback(null, data);
		});
	}
	route.push(routeResource);
}
