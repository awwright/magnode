
/** Maps a query string in a URI to a variant subset */

/*

type - select the variant that provides this output type
media - use the specified media type
pager[name][property] - pass property=value options to a pager by id
language - use the provided language wherever there's an option
properties - key-value pairs specific to the provided media type

*/

var qs = require('querystring');

// Attached to resource.variant.toURI is a function that lets you return a URI for a different variant *on the same resource*
// If you want to get a URI for a variant for a different resource, you must dereference it then call that resource's resource.variant.toURI
// What if this needs to be asynchronous? No, we should just pre-fetch all the possible variant URIs. For now.
module.exports.variantsToURI = variantsToURI;
function variantsToURI(variant){
	// Allows for either x.toURI() or toURI(x) usage
	variant = variant || this;
	var q = variant.params;
	var qs = [];
	if(variant.editable) qs.push('edit');
	if(variant.createNew) qs.push('new');
	if(variant.showDelete) qs.push('delete');

	if(variant.pager){
		if(typeof variant.pager.offset==='number') qs.push('offset='+variant.pager.offset);
		if(typeof variant.pager.limit==='number') qs.push('limit='+variant.pager.limit);
		if(typeof variant.pager.page==='number') qs.push('page='+variant.pager.page);
		if("from" in variant.pager) qs.push('from='+encodeURIComponent(variant.pager.from));
	}

	var keys = Object.keys(variant.params).sort();
	for(var n in variant.params){
		switch(n){
			case 'edit':
			case 'new':
			case 'delete':
			case 'offset':
			case 'limit':
				continue;
		}
		qs.push(encodeURIComponent(n)+'='+encodeURIComponent(variant.params[n]));
	}

	var uri = variant.resource;
	// Strip trailing ? because that looks nicer
	// A URI with a trailing ? is different than one without
	// So always strip
	if(qs.length){
		uri += '?'+qs.join('&');
	}
	return uri;
}

// The returned object is mostly key/value pairs but maybe they should be URIs...
// Let's wait for a problem in which doing that it will solve it
module.exports.parseUriVariants = function parseUriVariants(uri){
	var resource = uri.split('?',1)[0];
	var query = qs.parse(uri.substring(resource.length+1), /[&;]/g);
	var variant = {resource:resource, params:query};

	// Get a list of transforms to apply to the resource before we start rendering the data
	variant.applyTransforms = (Array.isArray(query.apply)&&query.apply) || (typeof query.apply=="string"&&[query.apply]) || [];
	// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
	variant.useTransformTypes = (Array.isArray(query.with)&&query.with) || (typeof query.with=="string"&&[query.with]) || [];
	// Provide an ?edit shortcut to the appropriate transformType
	variant.editable = typeof query.edit=="string";
	variant.createNew = typeof query.new=="string";
	variant.showDelete = typeof query.delete=="string";

	// Pagers
	var pager = variant.pager = variant.pager || {};
	if("offset" in query) pager.offset = parseInt(query.offset);
	if("limit" in query) pager.limit = parseInt(query.limit);
	if("page" in query) pager.page = parseInt(query.page);
	if("from" in query) pager.from = parseInt(query.from);

	// The value of either the "view" or "edit" parameter will be used to specify which media-type to render
	// Other implementations might like to set this value based on filename extension, instead
	variant.type = query.view || query.edit;

	// Allow the client to demand/require a particular media type set
	variant.media = query.media;

	variant.toURI = variantsToURI;

	return variant;
}
