
// TODO split this out into a "static file serving" interface so Nginx and other
// utilities can get in on the action
var send=require('send');
var url=require('url');
var fs=require('fs');

/* To enable this theme, you probably want to add this to your format.ttl:

<http://magnode.org/theme/twentyonetwelve/DocumentHTML_typeHTMLBody>
	a view:ViewTransform, view:FormTransform .
<http://magnode.org/theme/twentyonetwelve/HTMLBody_typePost>
	a view:ViewTransform .
<http://magnode.org/theme/twentyonetwelve/HTMLBody_typePage>
	a view:ViewTransform .
*/

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

	require('magnode/scan.turtle').scanDirectorySync(__dirname+'/format.ttl', render);
}
