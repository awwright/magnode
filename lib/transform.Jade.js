/*
e.g. Transform:SomeTransform
	a view:Jade ;
	view:file "path/to/template.jade" ;
	view:range type:HTMLBody ;
	view:domain type:ContentType .
*/
var util=require('util');
var fs = require('fs');

var jade=require('jade');
var jadeParser = require('jade/parser');

var relativeuri = require('./relativeuri');
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

// Jade uses /&(?!\w+;)/g but this means that valid entities won't be escaped...

function jadeAttrs(obj){
	var buf = [];
	var terse = obj.terse;
	delete obj.terse;
	var keys = Object.keys(obj);
	var len = keys.length;
	if (len) {
		buf.push('');
		for (var i = 0; i < len; ++i) {
		var key = keys[i];
		var val = obj[key];
			if (typeof val === 'boolean' || val === '' || val == null) {
				if (val) {
					buf.push( terse ? key : (key + '="' + key + '"'));
				}
			} else {
				buf.push(key + '="' + escapeHTMLAttr(val) + '"');
			}
		}
	}
	return buf.join(' ');
}

function recursiveCallGraphFunctions(query, locals){
	var evalQuery = Array.isArray(query)?[]:{};
	for(var f in query){
		if(typeof(query[f])=="function") evalQuery[f] = query[f](locals);
		else if(typeof(query[f])=="object") evalQuery[f] = arguments.callee(query[f], locals);
		else evalQuery[f] = query[f];
	}
	return evalQuery;
}

module.exports = function(db, transform, input, render, callback){
	var templateFile = db.match(transform,"http://magnode.org/view/file")[0].object.toString().replace(/^file:\/\//,'');
	var outputTypes = db.match(transform,"http://magnode.org/view/templateRange").map(function(v){return v.object;});
	if(!outputTypes.length){
		// If we don't know any values for this let's assume it's the same as the range
		// view:templateRange is a subPropertyOf view:range
		var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	}
	var titleOutputType = db.match(transform,"http://magnode.org/view/titleProperty").map(function(v){return v.object;});
	//console.log("Jade rendering: "+templateFile+" to "+outputType.join(","));
	var cache = module.exports.cache;
	var ret;
	function localurl(url){ return relativeuri(input.rdf, url); }
	var locals = {input:input, localurl:localurl};
	var helpers = {__:{lineno:1}, attrs:jadeAttrs, escape:escapeHTML, util:util};

	if(cache[templateFile]) {
		try{
			var fn = cache[templateFile];
			fn(locals, helpers, applyResult);
		}catch(e){
			callback(e);
		}
		return;
	}

	fs.readFile(templateFile, 'utf8', function(err, str){
		if (err) return void callback(err);
		try{
			// Parse
			var parser = new jadeParser(str, templateFile);
			var parserOut = parser.parse();
			//parser.debug();
			// Compile
			var compiler = new jade.Compiler(parserOut);

			var funcBody = 'var buf = [];\nwith(locals||{}){with(helpers){' + compiler.compile() + '}}\ncallback(null,buf.join(""));';
			//console.error('\x1b[1mParsed Nodes\x1b[0m:\n%s', util.inspect(parserOut,false,null).replace(/^/gm, '\t'));
			//console.error('\x1b[1mCompiled Function\x1b[0m:\n%s\n', funcBody.replace(/^/gm, '\t'));
			//console.error('\x1b[1mInput\x1b[0m:\n%s', util.inspect(input,true,null).replace(/^/gm, '\t'));
			var fn = cache[templateFile] = new Function('locals', 'helpers', 'callback', funcBody);
			fn(locals, helpers, applyResult);
		}catch (e) {
			return void callback(e);
		}
	});

	function applyResult(error, result){
		if(error) result=error.stack||error.toString();
		var output = {};
		outputTypes.forEach(function(v){
			switch(v){
			case 'http://magnode.org/DocumentTitle':
				output[v] = input.node && input.node[titleOutputType] || transform;
				break;
			case 'http://magnode.org/ResourceMenu':
				output[v] = [];
				break;
			default:
				output[v] = result;
				break;
			}
		});
		//console.log('\x1b[1mRender result\x1b[0m:\n%s\n', util.inspect(result).replace(/^/gm, '\t'));
		//console.log(util.inspect(result));
		callback(null, output);
	}
}
module.exports.URI = "http://magnode.org/view/Jade";
module.exports.cache = {};
