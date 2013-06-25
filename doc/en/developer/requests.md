## HTTP Requests

Magnode tries to use a highly modular, semantically meaningful method of processing a request. This section will describe how to define your own responses to do anything, like formatting a blog post, acting as a gateway to an external API, or accepting and processing the input of a custom form.

Requests are handled in three distinct phases. First, the request is accepted by the HTTP module, and is processed to begin buffering incoming entity-body data, to determine the requested resource URI, and similar common tasks. The resource is then looked up using the _router_ by asking each route if it is able to handle the requested URI. A route handler is selected, which then determines nature of the request: The resource is fetched from the database and its content type is determined. Finally, this resource is transformed into the requested target type (generally, HTML).


### Identifying the resource

The first step of processing a request is mapping the URI to a particular resource in a database.

A _URI provider_ defines a function that responds to a question: Are you able to handle this URI? If so, the URL router provides a function that may be called to fulfill the request, or a data record of the resource itself. This URI may be specified as a plain string, a regular expression, or as a function accepting a callback.

If the provider returns a function, then it may be called to provide an HTTP response. If so, the request is filled and processing ends here. Many of the "about" routes are defined in this manner, and respond only to a single URI like `/about:status`.

If the provider returns an Object key/value map, then it is a resource that is to be formatted into the requested type. In this case, that is an HTTP response. The resource is a key/value map of the resource, mapping the types of the resource to their respective representations.

There are several common modules for resolving a resource. The "route.mongodb.subject" module takes a MongoDB collection and searches for the requested URI in the "subject" field of an object.


### Rendering the resource

Once the HTTP module has the resource object, it needs to format it into an HTTP response. It looks at the provided input types and determines all the ways in which a series of applied transform functions will produce an HTTP response. It does this by examining the database of registered transform functions and their domain (required inputs) and range (outputs it produces). For example, the resource may be a "Blog post", for which there exists a function to format it as an "HTMLBody", which in turn has functions to be formatted into a "HTML Document" and then a "HTTP Response".

There may be multiple methods of serializing the list of transforms to produce an HTTP response. In this case, Magnode employs _Content-Type negotiation_ in order to produce an HTTP response that contains a desired Content-Type. There may still be multiple ways of producing a response of the same result Content-Type. In this case, Magnode sums the "nice values" of each transform, and picks the sequence with the lowest (highest priority) value; this is done so one may define a transform function that overrides another, but otherwise has a identical domain and range.

Other forms of negotiation are not considered, it is rare that the transform selected needs to vary with respect to any other form of negotiation like Accept-Language, Accept-Encoding, and Accept-Encoding, and transform functions are expected to be handled appropriately by each transform respectively.
