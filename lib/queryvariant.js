
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
	var qs = [];
	if(variant.createNew) qs.push('new');
	if(variant.editable) qs.push('edit');
	if(variant.showDelete) qs.push('delete');

	// Syntax to produce a variant with a particular type
	var requiredTypesChecklist = {};
	variant.requiredTypes.forEach(function(n){ requiredTypesChecklist[n]=false; });
	for(var n in variant.variantClasses){
		if(variant.variantClasses[n].every(function(m){ return requiredTypesChecklist[m]!==undefined; })){
			qs.push(n);
			variant.variantClasses[n].forEach(function(m){ requiredTypesChecklist[m]=true; })
		}
	}
	for(var n in requiredTypesChecklist){
		if(requiredTypesChecklist[n]===false){
			qs.push('type='+encodeURIComponent(n));
		}
	}

	if(variant.pager){
		if(typeof variant.pager.offset==='number') qs.push('offset='+variant.pager.offset);
		if(typeof variant.pager.limit==='number') qs.push('limit='+variant.pager.limit);
		if(typeof variant.pager.page==='number') qs.push('page='+variant.pager.page);
		if("from" in variant.pager) qs.push('from='+encodeURIComponent(variant.pager.from));
	}

	var keys = Object.keys(variant.params).sort();
	for(var n in variant.params){
		switch(n){
			case 'offset':
			case 'limit':
			case 'page':
			case 'from':
				continue;
		}
		if(variant.params[n]===true){
			qs.push(encodeURIComponent(n));
		}else{
			qs.push(encodeURIComponent(n)+'='+encodeURIComponent(variant.params[n]));
		}
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

// This function is just a default, and asynchronous calls aren't necessary here
// The variant of the returned resource map can be calculated asynchronously within the router if necessary
module.exports.parseUriVariants = function parseUriVariants(uri, variantClasses){
	// By our convention, the querystring identifies the variant, everything else identifies the non-information resource
	var resource = uri.split('?',1)[0];
	// TODO split on "&" or ";"
	var query = qs.parse(uri.substring(resource.length+1), '&');
	variantClasses = variantClasses || {};
	var variant = {resource:resource, params:query, variantClasses:variantClasses};

	// Get a list of transforms to apply to the resource before we start rendering the data
	variant.applyTransforms = (Array.isArray(query.apply)&&query.apply) || (typeof query.apply=="string"&&[query.apply]) || [];
	// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
	variant.useTransformTypes = (Array.isArray(query.with)&&query.with) || (typeof query.with=="string"&&[query.with]) || [];

	// Determine which variants the result must produce
	variant.requiredTypes = [];
	for(var k in variantClasses){
		if(k in query){
			variantClasses[k].forEach(function(v){
				variant.requiredTypes.push(v);
			});
			delete query[k];
		}
	}
	var types = variant.params.type || [];
	if(!Array.isArray(types)) types=[types];
	types.forEach(function(v){ variant.requiredTypes.push(v); });

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
