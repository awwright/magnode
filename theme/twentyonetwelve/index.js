
// TODO split this out into a "static file serving" interface so Nginx and other
// utilities can get in on the action
var send=require('send');
var url=require('url');
var fs=require('fs');

var rdf=require('rdf');
var jade = require('jade');

/* To enable this theme, you probably want to add this to your format.ttl:

<http://magnode.org/theme/twentyonetwelve/DocumentHTML_typeHTMLBody>
	a view:ViewTransform, view:FormTransform .
<http://magnode.org/theme/twentyonetwelve/HTMLBody_typePost>
	a view:ViewTransform .
<http://magnode.org/theme/twentyonetwelve/HTMLBody_typePage>
	a view:ViewTransform .
*/

// TODO this should probably be abstracted out soon
// Set it up to use a manifest/index file
// FIXME adding/removing RDF triples from the database is a perfectly functional but semantically incorrect
// way to enable/disable a theme. Enabling/disabling a theme should be controlled by membership to a class.
module.exports.importTheme = function(render, router){
	var p = '/twentyonetwelve/';
	// Create the sender-thing here
	function sendStatic(req, res){
		send(req, url.parse(req.url).pathname.substr(p.length-1)).root(__dirname).pipe(res);
	}
	// Register it with the URL router
	router.push(function(req, cb){
		if(req.url.substr(0,p.length)==p) cb(sendStatic);
		else cb(false);
	});

	// Add theme data to the render database
	var triples = [];
	function addTriple(s,p,o){
		var f = rdf.environment.createTriple(s,p,o);
		triples.push(f);
		render.db.add(f);
	}

	// Register the transform to handle the theme stuff
	// Maybe use render() to generate a compiled template from a Jade/etc source file
	// Register that function like so:
	var templateFilename = __dirname+'/DocumentHTML_typeHTMLBody.jade';
	var contents = fs.readFileSync(templateFilename, 'utf8');
	var renderDocumentFn = jade.compile(contents, {filename:templateFilename});
	function renderDocument(db, transform, input, render, callback){
		var outputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
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
		for(var i=0;i<outputType.length;i++){
			output[outputType[i]] = result;
		}
		callback(null, output);
	}

	var template = "http://magnode.org/theme/twentyonetwelve/DocumentHTML_typeHTMLBody";
	render.renders[template] = renderDocument;
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/theme/twentyonetwelve/Transform');

	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/DocumentHTML_Body');
	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/DocumentHTML_Body_Block_UserMenu');
	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/DocumentHTML_Body_Block_MainMenu');
	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/DocumentHTML_Body_Block_ManagementMenu');

	addTriple(template,'http://magnode.org/view/range','http://magnode.org/DocumentHTML');
	addTriple(template,'http://magnode.org/view/range','http://magnode.org/Document');


	// And the function for Posts
	var templateFilename = __dirname+'/HTMLBody_typePost.jade';
	var contents = fs.readFileSync(templateFilename, 'utf8');
	var renderPostFn = jade.compile(contents, {filename:templateFilename});
	function renderPost(db, transform, input, render, callback){
		var outputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
		var locals = {input:input};
		var result = renderPostFn(locals);
		var output = {};
		for(var i=0;i<outputType.length;i++) output[outputType[i]] = result;
		callback(null, output);
	}

	var template = "http://magnode.org/theme/twentyonetwelve/HTMLBody_typePost";
	render.renders[template] = renderPost;
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/theme/twentyonetwelve/Transform');
	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/Post');
	addTriple(template,'http://magnode.org/view/range','http://magnode.org/DocumentHTML_Body');
	addTriple(template,'http://magnode.org/view/range','http://magnode.org/DocumentHTML_BodyPost');

	var template = "http://magnode.org/theme/twentyonetwelve/HTMLBody_typePage";
	render.renders[template] = renderPost;
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/view/Transform');
	addTriple(template, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://magnode.org/theme/twentyonetwelve/Transform');
	addTriple(template,'http://magnode.org/view/domain','http://magnode.org/Page');
	addTriple(template,'http://magnode.org/view/range','http://magnode.org/DocumentHTML_Body');
	addTriple(template,'http://magnode.org/view/range','http://magnode.org/DocumentHTML_BodyPage');
}
