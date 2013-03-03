
var fs=require('fs');
var jade = require('jade');

var p = '/twentyonetwelve/';
var templateFilename = __dirname+'/DocumentHTML_typeHTMLBody.jade';
var contents = fs.readFileSync(templateFilename, 'utf8');
var renderDocumentFn = jade.compile(contents, {filename:templateFilename});
function renderDocument(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var theme = input.theme||{};
	// Add us some presentation
	var stylesheets = [{src:p+'codemirror.css'}, {src:p+'layout.css'}];
	if(theme.stylesheets instanceof Array) theme.stylesheets.forEach(function(v){ stylesheets.push(v); });
	// Add us some logic
	var scripts = [{type:'text/javascript',src:p+'codemirror.js'}];
	var codeMirrorModes = ['xml', 'javascript'];
	codeMirrorModes.forEach(function(v){scripts.push({type:'text/javascript',src:p+'codemirror-mode/'+v+'/'+v+'.js'})});
	scripts.push({type:'text/javascript',src:p+'layout.js'});
	if(theme.scripts instanceof Array) theme.scripts.forEach(function(v){ scripts.push(v); });
	// Add us some data
	var locals = {input:input, stylesheets:stylesheets, scripts:scripts};
	var result = renderDocumentFn(locals);
	var output = {};
	outputType.forEach(function(v){output[v]=result;});
	callback(null, output);
}

return module.exports=renderDocument;
