## Taxonomy

_Taxonomy_ is the practice of classifying content into groups. Taxonomies can provide behavior for categories, groups, tags, collections, sets, and lists.

The most general kind of entity in Magnode is the _resource_: Everything that can be named by a URI is consiered a resource.

The most general way that resources are classified is the _class_. "Blog post", "Rock music", and "North American mammal" are all kinds of classes.

Classes themselves can be subdivided:

* A _Schema_ defines which information a resource is expected to carry. A "Blog post" would be a schema because it is expected to contain an author, create-date, and body.
* A _Term_ is used to group resources that share some common criteria, like a genre or category. A "North American mammal" would be a term distinct from e.g. "Asian avians" or "Australian flora", even though all could share the same schema.
* A _Vocabulary_ is a collection of classes, particularly a collection of terms that serve similar purpose. For instance, you might have a a vocabulary of terms organizing books by their language, and a vocabulary of terms organizing books by their subject matter.

Magnode uses the standard terms `rdfs:subClassOf` and `rdf:type`/`a`, and usage of RDF Collections to organize content, and for more advanced usage, the [SKOS vocabulary](http://www.w3.org/TR/skos-primer) which is designed for this purpose. There is a taxonomy API to use to gain access for use when formatting classifications of resources for display.
