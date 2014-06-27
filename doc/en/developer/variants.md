## Variants and Content-Type Negotiation

By default, you can restrict the variant that is returned using query parameters in the URI. For instance, passing ?media=application/json will force the returned resource to be JSON. The media type is parsed and represents a set, the returned Content-Type could be e.g. `application/json;charset=utf-8;profile="http://example.com/x.json"`

However, you may wish to override this behavior using the "variant" resource. For instance, you may want to define that URIs which end with ".html" will always return "application/xhtml+xml", and ".json" will always return "application/json".

The default behavior is found in the "lib/queryvariant.js" module:

<pre class="lang-application-ecmascript">
var queryVariant = magnode.require('queryvariant').parseUriVariants;

function routeIndex(resource, callback){
	var data;
	/* fetch `resource` from a data source */
	if(new IRI(resource).path()==='/'){
		// Match &lt;/&gt; on any authority or scheme
		data = 'Welcome to '+resource;
	}
	if(!data){
		// Nothing found
		return void callback();
	}
	var variant = queryVariant(resource);
	if(resource.match(/\.html$/)){
		variant.media = 'application/xhtml+xml;charset=utf-8';
	}
	var ret = {};
	ret["variant"] = variant;
	ret[rdf.environment.resolve(':Published')] = data;
	ret['http://example.com/SomeResource'] = data;
	callback(null, ret);
}
route.push(routeIndex);
</pre>

The "lib/route.file.js" module can be used to do on-the-fly conversion of file types. For instance, a request to "variants.html" could be setup to read "variants.md" from the filesystem, with the `variants` parameter set to coerce the result to HTML.
