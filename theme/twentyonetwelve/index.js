var url=require('url');
var fs=require('fs');

var staticRouter = require('magnode/route.static');

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
module.exports.importTheme = function(route, resources, renders){
	staticRouter(route, resources, renders, __dirname+'/', '/twentyonetwelve/');
	require('magnode/scan.turtle').scanDirectorySync(__dirname+'/format.ttl', renders);
}
