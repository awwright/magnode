## Taxonomy

Normally _types_ are used to classify resources by the properties they hold. Blog posts can said to be an instance of the _blog post_ type.

These types (or _terms_) can be given subClassOf (also called _parent_ or _broader_) relationships, so that any instance of one term is also an instance of another term. For example, any instance of _rock music_ is also an instance of _music_.

These terms can belong to a special kind of term called _taxonomies_ (or _vocabulary_). For example, the _rock music_ term can belong to both _music genre_ and _music_.

These taxonomies can themselves be classified between each other. For example, the _music by artist_ and _music by genre_ vocabularies have a parent _music_. Any term added under the _music by artist_ vocabulary is also part of the _music_ vocabulary.

This is useful for classifying resources such as music tracks. The music track schema might allow for a property called “Music genre” and all items in this property must be a term under the “Music genre” vocabulary.

You can specify that any properties listed under the _music genre_ property are also given to the track’s listing of (say) _tags_ and `ref:type`.

Magnode uses the standard terms `rdfs:subClassOf` and `rdf:type`/`a`, and usage of RDF Collections to organize content, and for more advanced usage, the [SKOS vocabulary](http://www.w3.org/TR/skos-primer) which is designed for this purpose. There is a taxonomy API to use to gain access for use when formatting classifications of resources for display.