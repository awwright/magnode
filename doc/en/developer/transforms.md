## Transforms

Magnode uses a collection of functions to format a set of data towards a target output type by applying transforms to it, applying transforms that increment the data towards a format ready for output.


### Defining Transform Functions

Transform functions are stored in the Render#renders map by their URI.

The Render#db property is an RDF graph that describes all the available transform functions. It contains information on their:

* Domain, the types of inputs they require
* Range, the types of output they always produce
* Nice value, if the render produces multiple methods of creating a result, lower nice values are preferred
* Caching information, if and how the output may be cached

For your convienence, a function may be added using the Render#add call:

	function transform(db, transform, resources, render, callback){
		resources.response.setHeader('Content-Type', 'text/plain');
		resources.response.write('Have Resource:\n');
		resources.response.end(resources['http://example.com/SomeResource']);
		callback(null, {'http://magnode.org/HTTPResponse': 200});
	}
	var about = {
		id: 'http://example.com/transforms/HTTP_typeSomeResource',
		type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
		domain: ['http://example.com/SomeResource'],
		range: ['http://magnode.org/HTTPResponse']
	};
	renders.add(transform, about);

This will add the function to the function map, and import the metadata into the database.

It is possible to determine the function's own domain and range at runtime:

	function transform(db, transform, resources, render, callback){
		var domainTypesFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
		var domainTypes = db.getCollection(domainTypesFirst);
		var rangeTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
		var result;
		/* ... */
		var out = {};
		rangeTypes.forEach(function(n){ out[n] = result; });
		callback(null, out);
	}



### Rendering Data

Rendering is done using the Render#render method. The call takes a few arguments:

* targetType, which types should be produced/output
* input, the data available to format
* transformTypes, if a subset of the transforms should be used (e.g. only Get transforms, or Put)
* callback, a function(err, res) where res is a map containg keys, or null if no format could be negotiated

For example:

	var targetType = 'http://magnode.org/HTMLBody';
	var input = Object.create(resources.requestenv); // or set to {}
	input['http://example.com/field'] = "Stuff";
	var transformTypes = ['http://magnode.org/view/GetTransform'];
	render.render(targetType, input, transformTypes, function(err, res){
		 var result = res[targetType];
		 /* ... */
	});
