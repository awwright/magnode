## HTTP Requests

Magnode tries to use a highly modular, semantically meaningful method of processing a request. This section will describe how to handle any request, like formatting a blog post, acting as a gateway to an external API, or accepting and processing the input of a custom form.

Requests are handled in three distinct phases. First, the resource is looked up using the _router_ by asking each route if it is able to handle the requested URI. A route handler is selected, which then determines nature of the request: The resource is fetched from the database and its content type is determined. Finally, this resource is transformed into the requested target type (generally, HTML).


### URL Routes

The first step of processing a request, is figuring out who is going to process it. It is the job of the URL router to determine, by looking at the incoming request headers -- specifically, the URI and method -- which function will get to fetch the resource from the database.

A URL router defines a function that responds to a question: Are you able to handle this URI? If so, the URL router provides a function that may be called to fulfill the request.

It is up to a router to determine if it can handle a request, a task that may be done asynchronously so that it can ask a database if the resource exists within it.

Many of the routes respond only to a single URI, like `/about:version`. The most common routes ask the database if such a resource exists.

The most commonly used routes are more complex. Resources can be identified by their _id property, if an ObjectId, and if match, the standard MongoDB request handler is returned. Resources are more frequently identified by their URI, which searches the "subject" property. This router returns the same MongoDB rendering function, if it finds a match.

Sine URL router can only select one function, it stops as early as possible, once a route handler has indicated it can fill the request. This means static URLs will almost certinly be picked over resources defined in a database (an asynchronous operation).


### Processing the request

Once a route is selected to process the request, it is provided the request and response objects, and is expected to write the response back to the HTTP stream. Many routes are simple and for debugging, and immediately write a text/plain response. For these simple routes, the journey ends here.

More commonly, however, the processor is called because it matches the URI against a resource in the database. The processor's job is to accept this resource, determine the resource's types, and then render the database resource into a target resouce, commonly HTML.

The `route.resource.mongodb` class accepts a document, already identified and provided from the URL router step, and examines its "type" property to determine its types. This result, with its new, more generic semantics, is passed up to `route.resource`, which handles formatting and the HTTP response.

### Rendering the resource

After the URL route has fetched the resource, the route processor may need to render the resource into the targeted resource type.

In the default `route.resource` router, a list of resources, identified by their type, are combined with default resources (like the database connection and site-wide settings), and is rendered using Content-Type negotiation to determine the type to output.
