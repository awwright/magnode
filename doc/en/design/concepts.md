## Concepts

The Web is founded on a number of design concepts or axioms of design. They are summarized and detailed across a number of documents.

These documents should be considered required reading.


### Semantics are by definition

Semantics asks the programmer what is the _nature_ of the thing to be done?. It is not merely enough to have something that _seems_ to work, it must actually be _constistent_.

It is easy to get into trouble when you do not follow the conclusions of semantics. To go against the semantics of a program means you challenge the basis of its existance, its definition, like mis-using a word in conversation. At best it's confusing, at worse you risk being completely misunderstood.

Semantics are especially important in security: Mis-using a cryptographic primitive where it wasn't designed often fails catastrophically (for instance, most all uses of a cryptographic hash like SHA).


### Principle of least power

* <http://www.w3.org/DesignIssues/Principles.html>


### URIs/IRIs uniquely identify resources

The URI is defined in RFC 3986.

IRIs are the form of URIs that need not escape Unicode characters, and are defined in RFC 3987.

* <http://www.w3.org/TR/cooluris/>


### The Web is strictly voluntary

The Web is not subject to force or violence. It is designed to operate without a central authority or borders. It shares many properties with a fractal, in that it is _self-similar_, or _scale-free_.

* <http://www.w3.org/DesignIssues/Fractal.html>


### Resources are anything that can be identified by a URI

Which means, a resource can be anything.

* <http://www.w3.org/DesignIssues/TermResource.html>


### Information resources are _dereferenced_

The URL is the subset of URIs that are capable of being dereferenced, i.e. retrieived over the network.


### HTTP operates on resources

That is to say, HTTP is inherently RESTful.

* <http://www.w3.org/TR/chips/>
* <http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm>


### Information resources may be representations of non-information resources

You might have a webpage about your dog or car, for instance, the thing and the webpage about the thing both get different URIs.


### The Web is an implementation of REST

REST is a networked application architecture, the foundation of which was used to improve HTTP and many Web standards.

* <http://www.w3.org/TR/webarch/>
