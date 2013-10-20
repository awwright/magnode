var util = require('util');
var Render = require('./render');
var uriParse = require('url').parse;
var uriResolve = require('url').resolve;
var fs = require('fs');

var mime = require('mime');

// TODO Next, we'll make a route.resource.static router that will let administrators manage the filesystem

// TODO appearently we could use sendfile() but that's undocumented and not straightforward
// TODO also, Nginx X-Accel support, which appears to handle Range for you which is nice

module.exports = function registerHandler(route, resources, render, root, base){
	if(!render instanceof Render) throw new Error('view not an instanceof render object');
	var siteBase = resources.rdf&&resources.rdf.prefixes[''] || "";
	var basePrefix = uriResolve(siteBase, base||'/');

	// This is the function that the resource router will call when determining who can process the request
	function routeResource(resource, callback){
		// Code if there's a request
		var urlArgs = uriParse(resource, true);
		console.log('Static match:', resource, basePrefix, urlArgs.pathname);
		if(resource.substr(0, basePrefix.length)!==basePrefix) return void callback(null);

		if(Object.keys(urlArgs.query).length){
			return void callback(null);
		}

		var filepath = root + resource.substring(basePrefix.length);

		// Don't read hidden files or navigate about directories
		if(urlArgs.pathname[0]!=='/' || filepath.indexOf('/.')>=0) return void callback(null);
		console.log(filepath);

		fs.stat(filepath, statResponse);
		function statResponse(err, stat){
			if(!stat || !stat.isFile()) return void callback(null);

			// Code if we are able to execute the request
			callback(null, response);
			function response(request, response){
				if(!response){
					// We weren't assigned to handle this one
					// Clean up stuff
					return;
				}

				switch(request.method){
					case "GET":
					case "HEAD":
						break;
					default:
						response.statusCode = 405;
						response.end('Valid methods: GET, HEAD');
						return;
				}

				var etagBuf = new Buffer(16);
				etagBuf.writeUInt32BE((stat.mtime.valueOf()/0x10000)>>>0, 0);
				etagBuf.writeUInt32BE((stat.mtime.valueOf()&0xffff), 4);
				etagBuf.writeUInt32BE((stat.size/0x10000)>>>0, 8);
				etagBuf.writeUInt32BE((stat.size&0xffff)&0xffff, 12);
				var ETag = '"'+etagBuf.toString('base64').replace(/=/g,'')+'"';

				// Cache testing
				var ifModifiedSince = new Date(request.headers['if-modified-since']||'');
				if(Math.floor(stat.mtime.valueOf()/1000) <= Math.floor(ifModifiedSince.valueOf()/1000)){
					response.statusCode = 304;
				}
				if(request.headers['if-none-match']){
					var ifNoneMatch = request.headers['if-none-match'].split(/(\s*,\s*)/);
					if(ifNoneMatch.some(function(v){return v===ETag})){
						response.statusCode = 304;
					}
				}

				var ranges = [];
				if(request.headers['range']){
					// If content modified since If-Range, send the entire response instead of the range
					var ifRange = request.headers['if-range'];
					if(ifRange && (ifRange[0]=='"'||ifRange[1]==='/') && ifRange!==ETag){
						ranges = [{}];
					}else if(ifRange && Math.floor(stat.mtime.valueOf()/1000)>Math.floor(new Date(ifRange).valueOf()/1000)){
						ranges = [{}];
					}else{
						ranges = request.headers['range'].split(/(\s*,\s*)/).filter(function(v){return v});
					}
				}

				var options = [];
				if(ranges.length===0){
					options.push({});
				}else if(response.statusCode<300){
					response.statusCode=206;
					for(var i=0; i<ranges.length; i++){
						var p = ranges[i].match(/^(\d*)\s*-\s*(\d*)$/);
						if(!p){
							response.statusCode=416;
							break;
						}
						var start = p[1]&&parseInt(p[1]) || 0;
						var end = p[2]&&parseInt(p[2]) || (stat.size-1);
						if(start>=end || end>=stat.size){
							response.statusCode=416;
							break;
						}
						options.push({start:start, end:end});
					}
				}

				// Only handle the first range request, handling more than one involves a multipart/byteranges response
				var opt = options[0];
				response.setHeader('Accept-Ranges', 'bytes');
				response.setHeader('ETag', ETag);
				response.setHeader('Cache-Control', 'public, max-age=3600');
				response.setHeader('Last-Modified', stat.mtime.toUTCString());
				if(opt.start && opt.end){
					response.setHeader('Content-Range', 'bytes '+opt.start+'-'+opt.end+'/'+stat.size);
				}

				if(response.statusCode>=400){
					response.end();
					return;
				}
				response.setHeader('Content-Type', mime.lookup(filepath));

				if(response.statusCode>=300){
					response.end();
					return;
				}

				if(opt.start && opt.end){
					response.setHeader('Content-Length', opt.end-opt.start+1);
				}else{
					response.setHeader('Content-Length', stat.size);
				}
				var stream = fs.createReadStream(filepath, opt);				
				stream.pipe(response);
				request.on('close', function(){ stream.destroy(); });
			}
			function sendRange(options){

			}
		}
	};
	route.push(routeResource);
};

