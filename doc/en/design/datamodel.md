## Data model
The basic unit of data in Magnode is the [RDF Statement](http://www.w3.org/TR/rdf-primer/). RDF statements (or _triples_) make statements about resources, which is anything that is identifiable by a URI reference. In Magnode, statements about resources can be stored in a number of different data sources, such as a table in a database, or in a key-value store, with rules that specify how to generate the RDF statements. Because the RDF data model is used, it also adopts the "open world" assumption.

RDF is only a data model, Magnode does not adopt any particular syntax for representing the data. In the same way, the DOM, Document Object Model, is the data model underlying XML, HTML, and EXI.

### RDF Open World
RDF operates on the "open world" assumption. In an open world, you do not assume you have all the facts, you only that the facts you have are true. You must not design a data model in a way it could imply false statements if one of the statements were missing.

For instance, RDF provides two types of lists, _containers_ and _collections_. Containers are not capped, and may be incomplete. Collections are linked lists, and explicitly terminated, meaning you know the complete set.

If you want to see if a particular user "starred" a particular item, it's not enough to check for the non-existence of a "User starred item" statements. The correct way to identify this data is to have an explicit "Item Y NOT starred by user X", or to keep a Collection of all the starred items (and since the collection is the complete list of starred items, any not in the collection must not be starred).

You can't have statements that explicitly negate and override previous statements, since that would pose a contradiction, where one statements asserts something is always true, but another statements states the same case is false. One place to keep this in mind is in access control. You can't allow access to all resources except members of a particular class, since in general we don't know if a resource is _not_ a member of a class, we just know when it _is_ an instance. It is not even enough to specify a Collection of blacklisted URIs and allow access to all other resources, since it is often possible that a resource could be the same as another resource URI, using the `owl:sameAs` relation (though sometimes it can be inferred if two URIs must not be the same resource, if they are instances of mutually exclusive classes, for instance).

### Resources
It is important to distinguish between a URI representing an information resource (a document) about another resource, and a URI of the resource itself, in the context of dereferencing an. Specifically, we want to know the range of the HTTP dereferencing function. This is an issue referred to as the "[httpRange-14](http://www.w3.org/2001/tag/issues.html#httpRange-14)" issue. In many implementations, there are two different URLs that provide this, one URL is used to bring up a webpage about a person (say, their homepage) and another URL is used to identify them (so you can describe who they are).

<aside><p>For an extended discussion, see [What do HTTP URIs Identify?](http://www.w3.org/DesignIssues/HTTP-URI.html) by Tim Berners-Lee.</p></aside>

Magnode makes no such distinction, but instead opts to use Content-Type negotiation: If you make an HTTP request for a resource that isn't an information resource, use Content-Type negotiation to return an information resource.

In order to distinguish among information resources being returned, Magnode makes use of the `Content-Location` HTTP header:

> The `Content-Location` entity-header field MAY be used to supply the resource location for the entity enclosed in the message when that entity is accessible from a location separate from the requested resource's URI. A server SHOULD provide a `Content-Location` for the variant corresponding to the response entity; especially in the case where a resource has multiple entities associated with it, and those entities actually have separate locations by which they might be individually accessed, the server SHOULD provide a `Content-Location` for the particular variant which is returned.

This header is useful because an HTTP server can choose to send different information resources from the same URI depending on the situation. For instance, in Content-Type negotiation, a user agent may request `http://example.com/image` along with a preference that it prefers png images over jpeg images. In which case the server, which has many encodings of the same image, sends a png image, along with the header `Content-Location: http://example.com/image.png` to let the agent know where that particular information resource may be found in the future. Magnode likewise uses content-type negotiation to select a format to represent the requested non-information resource, and returns that resource and a header with the URI to generate it, for instance requesting the non-information resource `http://magnode.org/` will return `Content-Location: http://magnode.org/?apply=html`.

Since Magnode can format resources described by third-party or non-http URIs, it also sends the URI of the resource being described in an `X-Content-About` header. For instance, requesting `http://magnode.org/rdfs:Class` will return a header `X-Content-About: http://www.w3.org/2000/01/rdf-schema#Class`

Sometimes you want to download the RDF facts describing a resource; HTTP Content-type negotiation is sufficent to decide what format the data should be returned in, so web browsers get RDFa-enabled HTML, and semantic web spiders get RDF data with no presentation formatting (for instance, in n3, or a JSON-encoded graph).

However, sometimes there are resources that look very much like documents.

Maybe one wants to refer to a PDF which is a print-ready scientific paper. It is enough to make the document an RDF literal that's of type "Document" and "PDF Document", enough data to let Magnode know it's a file that needs to be sent with the standard PDF MIME-type.

Currently, problems are posed if one wants to write (say) a blog post that contains RDFa metadata about a scheduled event. RDFa does not natively allow one to place RDFa in a RDF fact, itself exposed as RDFa. RDFa inside the blog post would not get parsed by an RDFa parser if the entire body of the post is itself an RDFa fact. This is a known issue.
