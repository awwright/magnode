var url = require('url');

/** Rewrite a resource URL to be relative to the base
 * Even rewrite external URLs to use internal URLs with the appropriate prefix e.g. http://magnode.org/rdfs:Class
 * FIXME The rdf library doesn't have a concept of a base URI, so we use the default prefix (blank prefix) instead. This might be something to fix.
 */
module.exports = function relativeURI(env, href){
	var base = env.prefixes[''];
	// See if we can strip out just the domain name from the input href
	var baseparts = url.parse(base, undefined, true);
	var prefix = baseparts.protocol+'//'+baseparts.host;
	if(href.substr(0,prefix.length)===prefix) return href.substr(prefix.length);
	// Or see if there's some shortened form we can reduce to
	for(var p in env.prefixes){
		var prefix = env.prefixes[p];
		if(href.substr(0,prefix.length)===prefix) return base+p+':'+href.substr(prefix.length);
	}
	// Nothing? 
	return href;
}
