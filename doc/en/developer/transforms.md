## Transforms
Magnode uses a system of transforming a set of data towards a target output type by applying transforms to it, applying transforms that increment the data towards a format ready for output.

Magnode maintains a list of the

### Naming Transforms
A data type for use in association with another follows that data type after an underscore, e.g. Document\_Body, where Document is the full document, and Document\_Body is just the body sub-Document.

A subtype is simply prepended after the supertype, e.g. DocumentHTML, where DocumentHTML rdfs:subClassOf Document. e.g. DocumentHTML\_BodyBlog rdfs:subClassOf DocumentHTML\_Body.

For transforms, the input type being transformed is then prepended after the output, an underscore, and "type": DocumentHTML\_BodyBlog\_typeBlog names a transform.

If the transform is of a particular type that's not a View, such as a Form or a POST data handler, then prepend Form or Post after an underscore. e.g. DocumentHTML\_BodyBlog\_typeBlog\_Form.
