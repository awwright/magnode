
/** Maps a query string in a URI to a variant subset */

/*

type - select the variant that provides this output type
media - use the specified media type
pager[name][property] - pass property=value options to a pager by id
language - use the provided language wherever there's an option
properties - key-value pairs specific to the provided media type

*/

var qs = require('querystring');

module.exports.parseUriVariants = function parseUriVariants(uri){
	var queryStart = uri.indexOf('?',1);
	var query = (queryStart<0) ? {} : qs.parse(uri.substring(queryStart+1));
	var variant = {};

	// Get a list of transforms to apply to the resource before we start rendering the data
	variant.applyTransforms = (Array.isArray(query.apply)&&query.apply) || (typeof query.apply=="string"&&[query.apply]) || [];
	// Get a list of types which the transform must be (i.e. transforms that render an editalbe form, or a transform that renders a read-only view)
	variant.useTransformTypes = (Array.isArray(query.with)&&query.with) || (typeof query.with=="string"&&[query.with]) || [];
	// Provide an ?edit shortcut to the appropriate transformType
	variant.editable = typeof query.edit=="string";
	variant.createNew = typeof query.new=="string";
	variant.showDelete = typeof query.delete=="string";
	
	// The value of either the "view" or "edit" parameter will be used to specify which media-type to render
	// Other implementations might like to set this value based on filename extension, instead
	variant.type = query.view || query.edit;

	return variant;
}
