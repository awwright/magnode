/*
Transform:SomeTransform
	a view:Jade ;
	view:file "path/to/template.jade" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var fs = require('fs');
var url=require('url');

var jade=require('jade');
var jadeParser = require('jade/parser');
var selfClosing = require('jade/self-closing');
var utils = require('jade/utils');

var rdf = require('rdf');
rdf.environment.setPrefix("sp", "http://spinrdf.org/sp#");
var sp_ = "sp:_".resolve();

var jadeRDFaCompiler = function(node, options){
	this.foreachIndex = 0;
	jade.Compiler.call(this, node, options);
};
jadeRDFaCompiler.prototype = new jade.Compiler;
jadeRDFaCompiler.prototype.visitTag = function(tag){
	var name = tag.name;
	var blockProperties = null;

	if (!this.hasCompiledTag) {
		if (!this.hasCompiledDoctype && 'html' == name) {
			this.visitDoctype();
		}
		this.hasCompiledTag = true;
	}
	if(name=='value-of'){
		this.buffer("VALUE-OF",true);
	} else if(name=='for-each'){
		var foreachIndex = ++this.foreachIndex;
		// Buffer code
		if (tag.buffer) {
			var val = tag.val.trimLeft();
			this.buf.push('var __val__ = ' + val);
			val = 'null == __val__ ? "" : __val__';
			if (code.escape) val = 'escape(' + val + ')';
			this.buf.push("buf.push(" + val + ");");
		} else {
			this.buf.push(tag.val);
		}
		// Block support
		if (tag.block) {
			// console.error("\\nLOCAL:");console.error(locals);console.error(jadeCalculateParentVarValues(arguments.callee.queries['+foreachIndex+'].parent, locals));console.error(queryResult['+foreachIndex+']);
			if (!tag.buffer) this.buf.push('var rows=queryResult['+foreachIndex+'][jadeCalculateParentVarValues(arguments.callee.queries['+foreachIndex+'].parent, locals)]||[]; for(var i=0;i<rows.length;i++) (function(locals){with(locals){\n');
			this.visit(tag.block);
			if (!tag.buffer) this.buf.push('}}).call(this,rows[i]);\n');
		}
	} else if(name=='optional'){
		this.visit(tag.block);
	} else if(name=='switch'){
		this.visit(tag.block);
	} else if(name=='attribute'){
		this.visit(tag.block);
	} else if (~selfClosing.indexOf(name) && !this.xml) {
		this.buffer('<' + name);
		this.visitAttributes(tag.attrs);
		this.terse
			? this.buffer('>')
			: this.buffer('/>');
	} else {
		// Optimize attributes buffering
		if (tag.attrs.length) {
			this.buffer('<' + name);
			if (tag.attrs.length) this.visitAttributes(tag.attrs);
			this.buffer('>');
		} else {
			this.buffer('<' + name + '>');
		}
		if (tag.code) this.visitCode(tag.code);
		if (tag.text) this.buffer(utils.text(tag.text.nodes[0].trimLeft()));
		this.escape = 'pre' == tag.name;
		this.visit(tag.block);
		this.buffer('</' + name + '>');
	}
}
jadeRDFaCompiler.prototype.visitAttributes = function(attrs){
	var buf = [];
	var classes = [];

	if (this.terse) buf.push('terse: true');

	attrs.forEach(function(attr){
		if (attr.name == 'class') {
			classes.push('(' + attr.val + ')');
		} else {
			var pair = "'" + attr.name + "':(" + attr.val + ')';
			buf.push(pair);
		}
	});

	if (classes.length) {
		classes = classes.join(" + ' ' + ");
		buf.push("class: " + classes);
	}

	buf = buf.join(', ').replace('class:', '"class":');

	this.buf.push("buf.push(attrs({ " + buf + " }));");
}

function generateQueries(node){
	function visitBlock(block, context, query){
		var blocks = [];
		for(var i=0; i<block.nodes.length; i++){ visitNode(block.nodes[i], context, query);  }
		return blocks;
	}
	function visitNode(node, context, query){
		switch(node.constructor.name){
			case 'Node': queries.push('Node'); break;
			case 'Tag': visitTag(node, context, query);
			case 'Text': break;
			case 'Code':
				if(node.val.trimLeft()=="each") visitTagEach(node.block, context, query);
				else if(node.buffer && node.val.trimLeft().match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/)) break;
				break;
			//default: console.log('Unhandled: '+node.constructor.name + util.inspect(node,false,null)); break;
		}
	}
	function visitTag(node, context, query){
		// RDFa 5.5.1
		var recurse = true;
		var skip = false;
		var subject = null;
		var object = null;
		var mappings = {};
		for(var i in context.mappings) mappings[i]=context.mappings[i];
		var incomplete = []	;
		var language = context.language;
		var attributes = {};
		function parseNode(expr){
			//console.log('PARSING: '+expr);
			if(expr.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/)){
				// It's a variable
				return {var:sp_+expr};
			}
			try {
				var value = eval(expr);
				return value;
			}catch(e){
				// Maybe it's not valid?
				//console.error(e.stack||e.toString());
				//console.error({code:expr});
				return {code:expr};
			}
			return null;
		}
		function resolveCURIE(path){
			//return parseNode(path);
			return parseNode(path).resolve();
		}
		function resolveCURIEs(path){
			return parseNode(path).split(/\s+/).map(function(v){return v.resolve();});
		}
		function resolveURI(path){
			return url.resolve(base, parseNode(path));
		}
		function resolveURIorSafeCURIE(rpath){
			var path = parseNode(rpath);
			if(path.length>2 && path[0]=='[' && path[path.length-1]==']'){
				return resolveCURIE(path.substr(1, path.length-2));
			}else if(path.code){//throw new Error(path);
				var f = new Function('locals', 'with(locals){return arguments.callee.resolve('+path.code+');}');
				f.resolve = function(path){ return url.resolve(base, path); };
				return f;
			}else{
				return url.resolve(base, path);
			}
		}
		function resolveURIorSafeCURIEs(path){
			return parseNode(path).split(/\s+/).map(resolveURIorSafeCURIE);
		}

		for(var i=0; i<node.attrs.length; i++){
			var a=node.attrs[i];
			if(a.name.substr(0,6)=='xmlns:'){
				// RDFa 5.5.2
				mappings[a.name.substr(6)] = eval(a.val);
			}else if(a.name=='xml:lang'){
				// RDFa 5.5.3
				language=eval(a.val);
			}else{
				attributes[a.name] = a.val;
			}
		}
		if(attributes.rel || attributes.rev){
			// RDFa 5.5.5
			// Set subject
			if(attributes.about) subject=resolveURIorSafeCURIE(attributes.about);
			else if(attributes.src) subject=resolveURI(attributes.src);
			else subject=context.subject;
			// And object
			if(attributes.resource) object=resolveURIorSafeCURIE(attributes.resource);
			else if(attributes.href) object=resolveURI(attributes.href);
		}else{
			// RDFa 5.5.4 sets just subject
			if(attributes.about) subject=resolveURIorSafeCURIE(attributes.about);
			else if(attributes.src) subject=resolveURI(attributes.src);
			else if(attributes.resource) subject=resolveURIorSafeCURIE(attributes.resource);
			else if(attributes.href) subject=resolveURI(attributes.href);
			else if(node.name=="body" || node.name=="head") subject=base;
			else if(attributes.typeof) subject="_:t"+Math.random().toString().substr(2);
			else if(context.object){
				subject=context.object;
				// No rel, rev, about, src, resource, href, typeof, or property... Skip this for RDFa parsing
				if(!attributes.property) skip=true;
			}
		}
		function addTripleProperties(s,ps,o){
			// RDFa 5.5.7
			for(var i=0;i<ps.length;i++){
				query.push({subject:s, predicate:ps[i], object:o});
			}
		}
		if(attributes.typeof && subject){
			// RDFa 5.5.6
			// FIXME support variables here?
			var types = resolveCURIEs(attributes.typeof);
			for(var i=0;i<types.length;i++){
				query.push({subject:subject, predicate:"http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object:types[i]});
			}
		}
		function addTripleIncomplete(ps,f){
			// RDFa 5.5.8
			for(var i=0;i<ps.length;i++){
				incomplete.push({predicate:ps[i], forward:f});
			}
		}
		if(object && subject && attributes.rel){
			addTripleProperties(subject, resolveCURIEs(attributes.rel), object);
		}else if(attributes.rel){
			addTripleIncomplete(resolveCURIEs(attributes.rel), true);
		}
		if(object && subject && attributes.rev){
			addTripleProperties(object, resolveCURIEs(attributes.rev), subject);
		}else if(attributes.rev){
			addTripleIncomplete(resolveCURIEs(attributes.rev), false);
		}
		if((attributes.rel || attributes.rev) && !object) object="_:o"+Math.random().toString().substr(2);

		// RDFa 5.5.9
		var textonly = node.block&&node.block.nodes&&node.block.nodes.every(function(v){v.constructor	.name=="Text"});
		if(attributes.datatype && attributes.datatype!="rdf:XMLLiteral"){
			// Typed Literal
			var type = parseNode(attributes.datatype);
			object = attributes.content&&parseNode(attributes.content).tl(type); // FIXME get data from tag contents
		}else if(attributes.content){
			// Plain Literal
			object = parseNode(attributes.content);
			if(typeof(object)=="string") object=object.l();
			else if(object.var) object=object.var;
		}else if(textonly || attributes.datatype===""){
			// Plain Literal from text nodes
			// FIXME make this recursive
			object = (node.text&&node.text.nodes.join("")||"") + node.block.nodes.map(function(v){ return v.constructor.name=="Text"&&v.nodes.join("") || util.inspect(v); }).join("");
		}else if(attributes.datatype=="rdf:XMLLiteral"){
			object = JSON.stringify(node.block);
		}
		if(subject && object && attributes.property){
			var properties = resolveCURIEs(attributes.property);
			for(var i=0;i<properties.length;i++){
				query.push({subject:subject, predicate:properties[i], object:object});
			}
		}

		// RDFa 5.5.10 Complete incomplete triples
		if(skip==false && subject){
			for(var i=0; i<context.incomplete.length; i++){
				if(context.incomplete[i].forward)
					query.push({subject:subject, predicate:context.incomplete[i].predicate, object:context.subject});
				else
					query.push({subject:context.subject, predicate:context.incomplete[i].predicate, object:subject});
			}
		}
		if(!recurse) return;
		var childContext;
		if(skip){
			childContext =
				{ base: context.base
				, subject: context.subject
				, object: context.object
				, mappings: mappings
				, incomplete: context.incomplete
				, language: language
				};
		}else{
			childContext =
				{ base: context.base
				, subject: subject||context.subject
				, object: object||subject||context.subject
				, mappings: mappings
				, incomplete: (incomplete.length&&incomplete)||context.incomplete
				, language: language||context.language
				};
		}
		switch(node.name){
			case 'for-each':
				visitTagEach(node.block, childContext, query);
				break;
			case 'value-of': query.push('VALUE-OF:'+util.inspect(node)); break;
			default: visitBlock(node.block, childContext, query); break;
		}
	}
	function visitTagEach(block, context, query){
		var newquery = [query];
		queries.push(newquery);
		visitBlock(block, context, newquery);
	}
	var queries = [[]];
	var base = "http://default.base.example.net/a/b/c/d/";
	var context =
		{ base: base
		, subject: base
		, object: null
		, mappings: {}
		, incomplete: []
		, language: null
		};
	visitBlock(node, context, queries[0]);
	function flatten(a){
		return Array.prototype.concat.apply([],a.map(function(v){return Array.isArray(v)?flatten(v):v;}));
	}
	function varName(v){
		return v.toString().substr(0, sp_.length)==sp_ && v.toString().substr(sp_.length);
	};
	function getVarsUsed(t){
		var vars = [];
		for(var i=0; i<t.length; i++){
			var v;
			if((v=varName(t[i].subject)) && vars.indexOf(v)===-1) vars.push(v);
			if((v=varName(t[i].predicate)) && vars.indexOf(v)===-1) vars.push(v);
			if((v=varName(t[i].object)) && vars.indexOf(v)===-1) vars.push(v);
		}
		return vars;
	}
	function subst(a){
		var parent = Array.isArray(a[0])?flatten(a[0]):[];
		var flat = flatten(a);
		var vars = [];
		var queryClause = [];//new Array(a.length);
		for(var i=0; i<flat.length; i++){
			if(!flat[i].subject || !flat[i].predicate || !flat[i].object) continue;
			queryClause.push(
				{ "rdf:type": "http://spinrdf.org/sp#TriplePattern"
				, "http://spinrdf.org/sp#subject": flat[i].subject
				, "http://spinrdf.org/sp#predicate": flat[i].predicate
				, "http://spinrdf.org/sp#object": flat[i].object
				} );
		}
		console.log(queryClause);
		var query =
			{ a: "sp:Select"
			, "sp:resultVariables": []
			, "sp:where": queryClause
			};
		return {vars:getVarsUsed(flat), query:query, parent:getVarsUsed(parent), triples:a};
	}
	return queries.map(subst);
}

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

function jadeCalculateParentVarValues(parents, locals){
	return parents.map(function(v){return v+"="+(locals[v]).n3()+"\n";}).join('');
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
	var db = scope.input["db-rdfa"];
	function applyResult(error, result){
		if(error) result=error.stack||error.toString();
		var output = {};
		for(var i=0;i<templateOutputType.length;i++){
			output[templateOutputType[i]] = result;
		}
		//console.log('\x1b[1mRender result\x1b[0m:\n%s\n', util.inspect(result).replace(/^/gm, '\t'));
		//console.log(util.inspect(result));
		callback(output);
	}
	// Calculate DB data
	var queries = fn.queries;
	var queryResult = Array(queries.length);
	var querySortedResult = Array(queries.length);
	for(var i=0; i<queries.length; i++){
		querySortedResult[i]  = {};
		var queryGraph = recursiveCallGraphFunctions(queries[i].query, scope).ref("_:query").graphify();
		var result = queryResult[i] = db.evaluateQuery(queryGraph, "_:query", {});
		//querySortedResult[i].result = result;
		for(var j=0; j<result.length; j++){
			var key = jadeCalculateParentVarValues(queries[i].parent, result[j]);
			if(!querySortedResult[i][key]) querySortedResult[i][key]=[];
			querySortedResult[i][key].push(result[j]);
		}
	}
	//console.error('\x1b[1mQuery Result\x1b[0m:\n%s\n', util.inspect(querySortedResult,false,null).replace(/^/gm, '\t'));
	console.error('\x1b[1mQuery Result\x1b[0m:\n%s\n', util.inspect(queryResult,false,null).replace(/^/gm, '\t'));
	scope.queryResult = querySortedResult;
	if(queryResult[0].length==0 && queries[0].vars.length){
		return applyResult(new Error("No matching data"));
	}
	// FIXME is the UNDEFINED necessary?
	for(var i=0; i<queries[0].vars.length; i++){
		scope[queries[0].vars[i]] = queryResult[0][0]&&queryResult[0][0][queries[0].vars[i]] || ("#{"+queries[0].vars[i]+"=UNDEFINED}");
		console.error("Defining "+queries[0].vars[i]+" = "+scope.input[queries[0].vars[i]]);
	}
	// Run render
	fn(scope, helpers, applyResult);
}

module.exports = function(db, transform, input, render, callback){
	var templateFile = db.filter({subject:transform,predicate:"http://magnode.org/view/file"})[0].object.toString();
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	console.log("Jade rendering: "+templateFile+" to "+templateOutputType.join(","));
	var cache = module.exports.cache;
	var ret;
	var locals = {input:input};
	var helpers = {__:{lineno:1}, attrs:jadeAttrs, escape:jadeEscape, jadeCalculateParentVarValues:jadeCalculateParentVarValues, util:util};

   if(cache[templateFile]) {
		try{
			renderWithQuery(cache[templateFile], locals, helpers, templateOutputType, callback);
		}catch(e){
			callback({error:e});
		}
		return;
   }
	fs.readFile(templateFile, 'utf8', function(err, str){
		if (err) return callback({error:err});
		//try{
			// Parse
			var parser = new jadeParser(str, templateFile);
			var parserOut = parser.parse();
			//parser.debug();
			// Compile
			var compiler = new jadeRDFaCompiler(parserOut);
			var queries = generateQueries(parserOut);

			var funcBody = 'var buf = [];\nwith(locals||{}){with(helpers){' + compiler.compile() + '}}\ncallback(null,buf.join(""));';
			//if(templateFile=="template/DocumentHTML_BodyPage_typePage.jade")
			//console.error('\x1b[1mParsed Nodes\x1b[0m:\n%s', util.inspect(parserOut,false,null).replace(/^/gm, '\t'));
			//console.error('\x1b[1mDatabase Query\x1b[0m:\n%s', util.inspect(queries,false,null).replace(/^/gm, '\t'));
			//console.error('\x1b[1mCompiled Function\x1b[0m:\n%s\n', funcBody.replace(/^/gm, '\t'));
			//console.error('\x1b[1mInput\x1b[0m:\n%s', util.inspect(input,true,null).replace(/^/gm, '\t'));
			var fn = cache[templateFile] = new Function('locals', 'helpers', 'callback', funcBody);
			fn.queries = queries;
			renderWithQuery(fn, locals, helpers, templateOutputType, callback);
		//}catch (e) {
		//  return callback({error:e});
		//}
	});
}
module.exports.URI = "http://magnode.org/view/Jade";
module.exports.cache = {};
