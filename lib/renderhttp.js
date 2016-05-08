
var util = require('util');
var urlParse = require('url').parse;

var contenttype = require('contenttype');

var Render = require('./render');
var queryVariant = require('./queryvariant').parseUriVariants;
var parseJSON = require('./mongoutils').parseJSON;

module.exports = renderHTTP;

function renderHTTP(request, response, resources, render, useTransformTypes, urlArgs){
		// Now, find a suitable target format for the data
		var target = ['http://magnode.org/HTTPResponse'];
		var formatDocument = resources.variant.type;
		if(typeof formatDocument!='string') formatDocument=undefined;
		if(formatDocument){
			// We don't want anyone overriding the media: prefix
			formatDocument = (formatDocument.substr(0,6)==='media:'&&formatDocument) || resources.rdf.resolve(formatDocument) || resources.rdf.resolve(':'+formatDocument);
			// FIXME unshift just the base media type... filter the media type using contenttype.cmp later
			if(formatDocument) target.unshift(formatDocument);
		}

		var acceptList = contenttype.splitContentTypes(request.headers.accept || "*/*").map(contenttype.parseMedia);
		//acceptList.push(new contenttype.MediaType('*/*;q=0.0001'));
		var outputFound = render.search('http://magnode.org/HTTPResponse', resources, useTransformTypes);
		var contentList = [];
		// TODO implement some way to demand "If X is required in the output, then Y is also required in the output (up until all requested outputs are produced)"
		// E.g. if HTMLBody.EditForm is required in the output, then DocumentHTML.HTMLBody is required in the output, and if DocumentHTML.HTMLBody is required in the output, then HTTPResponse.DocumentHTML is required in the output
		// This serves to ensure that the requested EditForm is written to the HTTPResponse, and not some other HTMLBody that also can be written to an HTTPResponse
		var requiredTypes = resources.variant.requiredTypes || [];
		if(!Array.isArray(requiredTypes)) requiredTypes = Object.keys(requiredTypes);
		var outputOptions = outputFound.filter(function(res){
			// Make sure that res.output contains each item in requiredTypes
			if(!requiredTypes.every(function(v){ return (v in res.output); })){
				return false;
			}
			// Enforce match of type URIs/variant.type if it exists
			function filterType(v){
				if(v===resources.variant.type) return true;
			}
			if(resources.variant.type && !Object.keys(res.output).some(filterType)){
				return false;
			}
			// Enforce match of media types, if asked for
			function filterMedia(v){
				if(v.substr(0,6)!=='media:') return;
				var cmp = contenttype.mediaCmp(contenttype.parseMedia(resources.variant.media), contenttype.parseMedia(v.substring(6)));
				if(typeof cmp!='number') return;
				if(cmp >= 0) return true;
			}
			if(resources.variant.media && !Object.keys(res.output).some(filterMedia)){
				return false;
			}
			return true;
		});
		var filtered = outputOptions.filter(function(res){
			return Object.keys(res.output).some(function(v){
				// This allows you to add e.g. <?something> to a URL and only a path that
				// outputs view:something will be shown
				// This is useful for defining multiple views on a single resource e.g. ?comments ?history ?edit etc...
				if(v.substr(0,5)!=='view:') return;
				return typeof urlArgs.query[v.substring(5)]=='string';
			});
		});
		if(filtered.length) outputOptions=filtered;

		// Sort by the nice value first, then length of transforms
		outputOptions.sort(function(a, b){ return (a.nice-b.nice) || (a.transforms.length-b.transforms.length); });
		outputOptions.forEach(function(res){
			Object.keys(res.output).forEach(function(v){
				if(v.substr(0,6)!=='media:') return;
				var parsed = contenttype.parseMedia(v.substr(6));
				parsed.result = res;
				parsed.objtype = parsed.toString();
				contentList.push(parsed);
			});
		});
		// If the produced variants can be Content-Type negotiated, do that
		// If nothing negotiates, then pick one arbitrarily
		var selected = contenttype.select(contentList, acceptList);
		target = selected&&selected.result || outputOptions[0];
		if(resources.resource && selected){
			selected.q = null;
			response.setHeader('Content-Type', selected.toString());
			//resources.variant.params.media = selected.objtype;
			// Content-Location will be set during the HTTP response
			response.addHeader('Link', '<'+resources.variant.resource+'>;rel="about"');
			response.setHeader('Vary', 'Accept');
		}

		if(resources["debugMode"] && urlArgs.query.about==='transforms'){
			response.statusCode = 200;
			response.setHeader("Content-Type", "text/plain");
			response.write('Resource:\n');
			for(var o=resources; o!=Object.prototype; o=Object.getPrototypeOf(o)){
				response.write('\t' + Object.keys(o).join('  ') + '\n');
			}
			response.write('\n');
			response.write('useTransformTypes:  '+useTransformTypes.join('  ')+'\n\n');
			response.write('requiredRange:  '+requiredTypes.join('  ')+'\n\n');
			response.write('Selected:\n'+util.inspect(selected)+'\n\n');
			response.write('Options:\n'+util.inspect(outputOptions)+'\n\n');
			response.write('All outputs:\n'+util.inspect(render.range(resources))+'\n\n');
			response.end('\n');
			return;
		}

		if(!target){
			// FIXME if there's no render paths, return 500, but if the demanded variant is unavailable, return 404
			// if(outputFound.length){ ... }
			return void outputRender(new Error('Could not negotiate any Content-Type to generate'));
		}


		// Get a list of transforms to apply to the resource before we start rendering the data
		var applyTransforms = urlArgs.query.apply || [];
		if(!Array.isArray(applyTransforms)) applyTransforms = [applyTransforms];


		applyTransforms = applyTransforms.map(function(v){return resources.rdf.resolve(v);});
		//if(applyTransforms.length) console.log('\x1b[1mApply transforms\x1b[0m: %s\n', applyTransforms.join(', '));
		//if(useTransformTypes.length) console.log('\x1b[1mUse transform types\x1b[0m: %s\n', useTransformTypes.join(', '));

		// Take format=<transform> arguments from the URL and apply them to the inputs.
		// This can be used to force a particular type of formatting, if multiple types can format one of the input arguments.
		render.applyTransforms(applyTransforms.concat([]), resources, function(err, result){
			if(err) return void outputRender(err, result);
			// Do the render step
			if(target.transforms){
				render.applyTransforms(target.transforms, result, outputRender);
			}else{
				render.render(target, result, useTransformTypes, outputRender);
			}
		});

		function outputRender(err, formatted){
			//console.log(util.inspect(arguments,false,0));
			if(!formatted || !formatted['http://magnode.org/HTTPResponse']){
				if(response.statusCode<400) response.statusCode = 500;
				var id = (new Date).getTime().toString()+Math.random().toFixed(8).substr(1);
				try {
					response.setHeader("Content-Type", "text/plain");
					//response.write(util.inspect(request));
					//response.write("formatted:\n"+util.inspect(formatted)+"\n");
					response.write(response.statusCode+' '+require('http').STATUS_CODES[response.statusCode]+'\n');
					response.write("Could not render resource <"+resources.resource+">\n");
					if(err && resources["debugMode"]){
						response.write((err.stack||err.toString())+"\n\n");
					}else if(err){
						response.write("Timestamp "+id+"\n");
					}
					response.end();
				}catch(e){
					console.error('Could not write error to connected client, response already written but no HTTPResponse object was returned');
					response.write((e.stack||e.toString())+"\n");
				}
				console.error("Timestamp "+id+"\n"+(err.stack||err.toString())+"\n\n");
			}
			console.log(request.socket.remoteAddress, request.method, request.url, 'HTTP/'+request.httpVersion, ' - <'+request.uri+'>', response.statusCode);
		}
}
