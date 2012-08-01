## Serving Webpages

Magnode works on the theory that it formats RDF resources as HTML when they are dereferenced, serving RDFa-enabled HTML when HTML is requested. By request, formats that do not embed RDF data can be returned, for instance, PNG images of plots of data.

### Overview

1. An incoming HTTP request triggers an event and is sent to the URL router.
2. Based on the request headers (but not the requested URL), a target content-type is selected to be generated in response.
3. All of the modules capable of processing an HTTP request are asked if they can handle the incoming request.
4. The first module that can do so is given the request details, and creates the relevant resources.
5. Using the collection of transforms made available to Magnode, the resources for the request are used to craft a response of the target content-type.

### Application Server
This is the primary use of Magnode, and the `magnode.js` application that ships with the program connects to a database and looks at an established configuration of how to setup components like databases and content types, instead of being done in source code. Information about the initial database connection is stored in a simple ini file:

	database = 4store://localhost/magnode
	profile = _:profile

With the master database specified, it asks the resource as specified by `profile` for information about additional databases to setup, users and permissions (authentication and authorization), content types, and transforms. Additional information about setting up Magnode as an application is available from the [User's Guide](#user.setup).

Magnode works on the basis that you're formatting existing resources for display. But what if you want to see a form for a new resource? You would have to build a form to format a resource that doesn't exist. Unless you create a module that does exactly that, and "formats" an empty form from an anonymous resource (a bnode) that is availabe to the local scope only, which is given a URI when submitted and saved to the master database.

### RDF Resources
Sometimes you want to dereference a resource using Magnode that it isn't the webserver for. Take for instance the `rdfs:Class` resource, whose URI is `http://www.w3.org/2000/01/rdf-schema#Class`: you may want to see how a Magnode instance handles it, even though dereferencing it would normally take one to W3C servers. External resources can be dereferenced to Magnode servers, if you use the full or prefixed URL in the path. The `rdfs:Class` resource as understood by `http://magnode.org` would be accessible at `http://magnode.org/rdfs:Class`. For this or other reasons, the URL that is dereferenced may not be the cannoical URL for the resource. For this, Magnode returns `X-Content-About` header that identifies the RDF resource being described, which may be a different URL, including a different path or domain.

### Scripting
But this is not the extent of the power that Magnode holds, the transform engine can be used by itself to create static websites. Magnode is a framework that can be used with hand-coding, for projects where a CMS frontend is not desired, or for generating static content, or serving resources over a protocol other than HTTP (like emails or SSH, for instance).

This is not considered essential setup information and is kept with the [API Documentation](#api).

### Queries
A query engine can be created by parsing a natural language query into URIs, into a formatted response. By breaking down a natural language query into a structure of resources, Magnode can parse the query into resources based on the resource's associated metadata like their `rdfs:label`. The resources are then examined for any special logic handlers on how to handle sibling or child resources, and given the oppertunity to return a resource return-value. After all executed, the resource(s) are transformed into a formatted result set.

