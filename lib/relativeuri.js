var url = require('url');

/** Rewrite a resource URL to be relative to the base
 * Even rewrite external URLs to use internal URLs with the appropriate prefix e.g. http://magnode.org/rdfs:Class
 * FIXME The rdf library doesn't have a concept of a base URI, so we use the default prefix (blank prefix) instead. This might be something to fix.
 */
module.exports = function relativeURI(env, href){
	// No URL means no URLRef, in all cases no href is a bug... I think FIXME
	if(!href) return '';
	// FIXME accept a `base` argument since the base changes per document
	var base = env.prefixes[''];
	// See if we can strip out just the domain name from the input href
	var baseparts = url.parse(base, undefined, true);
	var relprefix = baseparts.protocol+'//'+baseparts.host+'/';
	if(href.substr(0,relprefix.length)===relprefix) return href.substr(relprefix.length-1);
	// Then try a CURIE
	var local = './/'+href;
	for(var p in env.prefixes){
		var ns = env.prefixes[p];
		var short = p?(p+':'):'';
		// Skip if this length wouldn't decrease
		if(local.length < href.length-ns.length+short.length) continue;
		if(href.substr(0,ns.length)===ns) local = short + href.substr(ns.length);
	}
	// If no reduction could be made, this'll return something like </.//http://example.com/>
	return '/'+local;
}
