## Application/Framework Getting Started

Magnode can be used as a framework to write your own hypermedia application.

Alternatively, Magnode comes with a default application that can be setup and maintained through configuration files and a Web interface in the style of a Content Management System. For this usage, see Setup and the User's Guide.

<style type="text/css">
.lang-application-ecmascript {
	border: solid 1px grey;
}
</style>

### The Pipeline

Magnode acts as a framework that exposes the functionality of HTTP, while isolating its complexity (as any good layer in a stack is supposed to do). Magnode operates in two steps: First, it queries a data source (like the filesystem or a database) for information that could possibly describe a URI, and how that data should be formatted; then, it applies a series of functions that can transform the retreived information into the target format. Writing an application in Magnode involves composing functions to fill both these steps.

### Setup

To start on a new application, the best option is to clone the Git repository:

<pre>
$ git clone https://github.com/Acubed/magnode.git
$ cd magnode
$ mkdir local
$ cd local
</pre>

Inside the "<code>local</code>", directory and create a file called <code>httpd.js</code>.

Let's define some configuration information for what we want our program to do:

<pre class="lang-application-ecmascript httpd">
var httpInterfaces = [8080];
</pre>

Then we will define the variables that will do routing, formatting, and store runtime data:

<pre class="lang-application-ecmascript httpd">
var magnode = require('magnode');
var rdf = require('rdf');
var route = new magnode.Route;
var renders = new magnode.Render;
var resources = {};
</pre>

The `resources` variable will store the default resources that apply to all requests in the application, including which database connections and authorization and authentication information, and CURIE resolving and other URI functions.

First setup the RDF environment, which is used to expand and collapse URIs:

<pre class="lang-application-ecmascript httpd">
// Abolute URIs are made relative based upon the default prefix
// Set this to the main URL of your application
rdf.environment.setDefaultPrefix('http://localhost/');
// Named prefixes are used for resolving CURIEs in the path component of URLs
// e.g. http://example.com/magnode:Page becomes http://magnode.org/Page
rdf.environment.setPrefix("magnode", "http://magnode.org/");
rdf.environment.setPrefix("meta", rdf.environment.resolve(':about#'));

//resources["debugMode"] = true;
resources["rdf"] = rdf.environment;
</pre>

### Dereferencing Requests

All resourceful requests (GET, POST, etc, most methods excluding PUT and TRACE) will first hit the router: the component that maps URIs a resource and the associated data to respond to the request.

A routing function simply accepts a URI and a callback:

<pre class="lang-application-ecmascript httpd">
function routeThing(resource, callback){
	/* fetch `resource` from a data source */
	var data = 'Resource: '+resource;
	var ret = {};
	ret[rdf.environment.resolve(':Published')] = data;
	ret['http://example.com/SomeResource'] = data;
	callback(null, ret);
}
route.push(routeThing);
</pre>

You might also consider adding one of several builtin routes:

<pre class="lang-application-ecmascript httpd">
(magnode.require("route.status"))(route);
(magnode.require("route.routes"))(route);
(magnode.require("route.transforms"))(route, resources, renders);
</pre>

### Rendering Resources

Once we've dereferenced a resource, we need to define how to serialize it into a response for the client. It is possible to serialize the resource into a number of different formats, which can vary by numerous dimensions like media type (HTML. JSON, Atom, images), cosmetic differences (different Website themes, JSON schemas, or API versions), i18n options (translations, date formats), and more.

When a request comes out of the router, it is combined with the defined default resources, which store application-level configuration like database connections and authentication and authorization configuration. Magnode searches a database of _transform functions_ to format the provided resources into an HTTP response. If multiple methods are available, one is selected based on Content-Type negotiation and what the router requested.

The default resources and the resources returned by the router are passed to the _render_, which calculates how to generate an HTTP response by combining a series of _transform functions_

The signature of a transform is a little more complex, it accepts the following arguments:

<ol>
<li>db, the transform database object</li>
<li>transform, the name of the transform being executed</li>
<li>resources, the key/value map of the input resources to format (enumerated by their type)</li>
<li>render, the render object executing the transform</li>
<li>callback, with the signature <code>function(err, res)</code> where res is the formatted results as a type-value map</li>
</ol>

The transform also needs to be registered in the database with metadata describing where it may be used.

<pre class="lang-application-ecmascript httpd">
function transform(db, transform, resources, render, callback){
	resources.response.setHeader('Content-Type', 'text/plain');
	resources.response.write('Have Resource:\n');
	resources.response.end(resources['http://example.com/SomeResource']);
	callback(null, {'http://magnode.org/HTTPResponse': 200});
}
transform.about = {
	id: 'http://example.com/transforms/HTTP_typeSomeResource',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
	domain: ['http://example.com/SomeResource'],
	range: ['http://magnode.org/HTTPResponse']
};
renders.add(transform, transform.about);
</pre>


### Saving Data

Data is saved using PUT requests. The resource identified in a PUT request is the one attached in the upload entity-body, and is to be saved at the request-uri, even if there is no resource already there, so the request will never return 404 or 410. Magnode uses PUT requests to save data, and even uses them internally to to POST new items to a collection.

PUT requests are handled using the internal transform system to convert the uploaded entity-body into a form suitable for database storage. Usage of this is demonstrated in a later chapter.


### Setting up Authentication

Authentication and authorization is required, even if all the files you're serving are public (as on a typical static webserver).
Here, we will use <code>http://localhost/Published</code> to identify resources that are publically viewable.

<pre class="lang-application-ecmascript httpd">
resources["authz"] = new (magnode.require("authorization.any"))(
	[ new (magnode.require("authorization.read"))(['get'], [rdf.environment.resolve(':Published')])
	, new (magnode.require("authorization.read"))(['get'], ['http://magnode.org/NotFound'])
	] );
</pre>


### Open HTTP Listeners

Now we pass the routers and the rendering formatters to the HTTP request parser, and open an HTTP port to bound to this request parser.

<pre class="lang-application-ecmascript httpd">
var listener = magnode.require('http').createListener(route, resources, renders);
magnode.startServers(listener, httpInterfaces, function(err, interfaces){
	if(err){
		console.error(err.stack||err.toString());
		process.exit(2);
		return;
	}
	console.log('All ready');
});
</pre>

The listener is the component responsible for accepting an incoming HTTP request, setting up processing of the incoming entity-body (if any), dereferencing the referenced URI, formatting a response, and in general implementing all the features of HTTP (see the design documentation for details).

### Running your Application

If we throw all this code into a file, you should get something resembling <a href="../../../setup/example-simple/httpd.js">setup/example-simple/httpd.js</a>. Run it in a prompt:

<pre>
$ node httpd.js
HTTP server listening on IPv4 0.0.0.0:8080
All ready
</pre>

<!--
<h2>httpd.js</h2>
<pre id="httpdsrc" class="lang-application-ecmascript"></pre>
<button id="httpdgen">Generate</button>
<script type="application/ecmascript">
function httpdgen(){
	var sum = '';
	var list = document.getElementsByClassName('httpd');
	Array.prototype.slice.call(list).forEach(function(v){
		sum += v.textContent+"\n";
		console.log(sum);
	});
	document.getElementById('httpdsrc').textContent = sum;
}
document.getElementById('httpdgen').onclick = httpdgen;
</script>
-->