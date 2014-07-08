## Transforms

The core of Magnode is the transform process. To date, most content management systems use a "partials" template system, whereby data for a page body is formatted with one template (selected depending on the data type), and then the formatted body is included in a master template for final output.

The transform process instead accepts input resources and requested output types, and applies predefined transforms to generate new resources that are a step closer to the requested output types. Input resources may be an RDF typed literal, a Javascript value, or a URI that identifies a resource to be transformed. In order to do this, Magnode creates the notion that Javascript objects and specific typed literals may also be instances of a Class.

Take for instance formatting a blog post. The intended output is an HTML document `http://magnode.org/DocumentHTML`, and the database connection provided as type `http://magnode.org/Database` and a blog resource URI `http://magnode.org/2011/01/02/a-blog-post` provided as type `http://magnode.org/Blog` are provided as inputs. There may not be a single transform to take a blog resource and format it as an HTML document, but there is one transform that takes a blog post resource and a database connection and generates an HTML body of types `http://magnode.org/DocumentHTML_Body` and `http://magnode.org/DocumentHTML_BodyBlog`, and another transform that transforms the HTML body into the target output (`http://magnode.org/DocumentHTML`).

To know which transforms to apply, each transform has an associated _domain_ and _range_. The domain of a transform is all the inputs that it requires to operate, and the range is the types that the transform will output. Because these are predefined, the transform engine can calculate which transforms to apply before actually running them.


### Selection of Variants

When rendering a data row into an information resource, there is a large set of variants that could be produced, and Magnode must select just one of them. There are many dimensions over which a variant can vary:

* Media type (e.g. JSON, domain-specific XML, HTML, Markdown, PDF)
* Pagation/subsets (e.g. page number, results per page, offset)
* Usage of features (Enable/disable XForms, SVG, scripting)
* Media type version to use (API version 3, etc)
* Locale and i18n options

Some of these options can vary multiple times over a page - there might be multiple paged regions in a resulting document.

These subsets can be described using RDF statements. The statements may be sourced from a number of locations, like HTTP headers, and provided by the URI router, which is tasked with mapping a URI to such values. For instance, a URI router might define all URI paths ending in .html to output application/xhtml+xml, and might define /page/$number to produce page number $number of a result set. By default, most URI routers will implement these properties in the query portion of the URI.

There is still the question of how to map a variant to a compact URI. The URI router can probably map a variant back to a URI.


### Naming Transforms

A data type for use in association with another follows that data type after an underscore, e.g. Document\_Body, where Document is the full document, and Document\_Body is just the body sub-Document.

A subtype is simply prepended after the supertype, e.g. DocumentHTML, where DocumentHTML rdfs:subClassOf Document. e.g. DocumentHTML\_BodyBlog rdfs:subClassOf DocumentHTML\_Body.

For transforms, the input type being transformed is then prepended after the output, an underscore, and "type": DocumentHTML\_BodyBlog\_typeBlog names a transform.

If the transform is of a particular type that's not a View, such as a Form or a POST data handler, then prepend Form or Post after an underscore. e.g. DocumentHTML\_BodyBlog\_typeBlog\_Form.
