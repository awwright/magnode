## Concepts

The Web is founded on a number of design concepts or axioms of design. They are summarized and detailed across a number of documents.

These documents should be considered required reading.


### Semantics are by definition

Semantics asks the programmer what is the _nature_ of the thing to be done?. It is not merely enough to have something that _seems_ to work, it must actually be _constistent_.

It is easy to get into trouble when you do not follow the conclusions of semantics. To go against the semantics of a program means you challenge the basis of its existance, its definition, like mis-using a word in conversation. At best it's confusing, at worse you risk being completely misunderstood.

For instance, you should never use a cryptograph hash directly: The definition of a hash is a function that will throughly mix the contents of the input so that any property of the input cannot be determined by examining the output (in fewer CPU cycles than it takes to brute-force the solution space). This is only one step of many in order to secure an authenticated stream against _all_ possible attacks. Hashes (usually) carry the property that given Hash(K) for some unknown content K, it is trivial to find the hash of appending something to that content, Hash(K || a), _a_ being some attacker-provided content. This means that if you use a hash to authenticate a stream, any attacker can append data to that stream and make it look authentic. _Hashes are not approved or designed for authenticating._ This is the job of a MAC, or Message Authentication Code. Likewise, hashes reduce the security of a message to half their length, but they do not add security that didn't exist in the input data: Using a hash function to store passwords is a bad idea. Instead, use a Password-Based Key Derivation Function which is specifically designed to add to the security of its input: Usually about 10-12 bits of security.


### Principle of least power

* <http://www.w3.org/DesignIssues/Principles.html>


### URIs/IRIs are globally unique identifiers

The URI is defined in RFC 3986.

IRIs are the form of URIs that need not escape Unicode characters, and are defined in RFC 3987.


### The Web is strictly voluntary

The Web is not subject to force or violence. It is designed to operate without a central authority or borders. It shares many properties with a fractal, in that it is _self-similar_, or _scale-free_.

* <http://www.w3.org/DesignIssues/Fractal.html>


### Resources are anything that can be identified by a URI

Which means, a resource can be anything.

* <http://www.w3.org/DesignIssues/TermResource.html>
* <http://www.w3.org/TR/webarch/>
* <http://www.w3.org/TR/cooluris/>


### Information resources are _dereferenced_

The URL is the subset of URIs that are capable of being dereferenced, i.e. retrieived over the network.


### HTTP is designed to retrive information resources

That is to say, HTTP is inherently RESTful.

* <http://www.w3.org/TR/chips/>
* <http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm>


### Information resources may be representations of non-information resources

You might have a webpage about your dog or car, for instance, the thing and the webpage about the thing both get different URIs.
