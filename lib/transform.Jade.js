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

function jadeEscape(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jadeAttrs(obj){
  var buf = []
    , terse = obj.terse;
  delete obj.terse;
  var keys = Object.keys(obj)
    , len = keys.length;
  if (len) {
    buf.push('');
    for (var i = 0; i < len; ++i) {
      var key = keys[i]
        , val = obj[key];
      if (typeof val === 'boolean' || val === '' || val == null) {
        if (val) {
          terse
            ? buf.push(key)
            : buf.push(key + '="' + key + '"');
        }
      } else {
        buf.push(key + '="' + jadeEscape(val) + '"');
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

function renderWithQuery(fn, scope, helpers, templateOutputType, callback){
	function applyResult(error, result){
		if(error) result=error.stack||error.toString();
		var output = {};
		for(var i=0;i<templateOutputType.length;i++){
			output[templateOutputType[i]] = result;
		}
		//console.log('\x1b[1mRender result\x1b[0m:\n%s\n', util.inspect(result).replace(/^/gm, '\t'));
		//console.log(util.inspect(result));
		callback(null, output);
	}
	// Run render
	fn(scope, helpers, applyResult);
}

module.exports = function(db, transform, input, render, callback){
	var templateFile = db.match(transform,"http://magnode.org/view/file")[0].object.toString();
	var templateOutputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	//console.log("Jade rendering: "+templateFile+" to "+templateOutputType.join(","));
	var cache = module.exports.cache;
	var ret;
	function localurl(url){ return relativeuri(input.rdf, url); }
	var locals = {input:input, localurl:localurl};
	var helpers = {__:{lineno:1}, attrs:jadeAttrs, escape:jadeEscape, util:util};

	if(cache[templateFile]) {
		try{
			renderWithQuery(cache[templateFile], locals, helpers, templateOutputType, callback);
		}catch(e){
			callback(e);
		}
		return;
	}
	fs.readFile(templateFile, 'utf8', function(err, str){
		if (err) return callback(err);
		//try{
			// Parse
			var parser = new jadeParser(str, templateFile);
			var parserOut = parser.parse();
			//parser.debug();
			// Compile
			var compiler = new jade.Compiler(parserOut);

			var funcBody = 'var buf = [];\nwith(locals||{}){with(helpers){' + compiler.compile() + '}}\ncallback(null,buf.join(""));';
			//console.error('\x1b[1mParsed Nodes\x1b[0m:\n%s', util.inspect(parserOut,false,null).replace(/^/gm, '\t'));
			//console.error('\x1b[1mDatabase Query\x1b[0m:\n%s', util.inspect(queries,false,null).replace(/^/gm, '\t'));
			//console.error('\x1b[1mCompiled Function\x1b[0m:\n%s\n', funcBody.replace(/^/gm, '\t'));
			//console.error('\x1b[1mInput\x1b[0m:\n%s', util.inspect(input,true,null).replace(/^/gm, '\t'));
			var fn = cache[templateFile] = new Function('locals', 'helpers', 'callback', funcBody);
			renderWithQuery(fn, locals, helpers, templateOutputType, callback);
		//}catch (e) {
		//  return callback({error:e});
		//}
	});
}
module.exports.URI = "http://magnode.org/view/Jade";
module.exports.cache = {};
