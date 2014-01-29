## Libraries

Magnode uses numerous third-party standards and libraries to manage the data model.

### Web Standards

* [RFC3986: URIs](http://www.ietf.org/rfc/rfc3986.txt)
* [RFC2616: HTTP](http://www.ietf.org/rfc/rfc2616.txt)
* [ECMAScript](http://ecma-international.org/ecma-262/5.1/)

### RDF

Magnode uses its own Node.js-specific implementation of several standards, which is maintained as a seperate repository at [github.com/Acubed/node-rdf](https://github.com/Acubed/node-rdf)

Magnode implements the following standards and vocabularies:

* [RDF Primer](http://www.w3.org/TR/rdf-primer/)
* [RDFS: RDF Schema](http://www.w3.org/TR/rdf-schema/)
* [RDF Semantics](http://www.w3.org/TR/rdf-mt/)
* [SKOS: Simple Knowledge Organization System](http://www.w3.org/TR/skos-primer/)
* [Turtle: Terse RDF Triple Language](http://www.w3.org/TR/turtle/)
* [R2RML](http://www.w3.org/TR/r2rml/)
* [RDB Direct Mapping: A Direct Mapping of Relational Data to RDF](http://www.w3.org/TR/rdb-direct-mapping/)

### SPARQL

Query/update standards:

* [SPARQL 1.1](http://www.w3.org/TR/sparql11-query/)
* [SPARQL 1.1 Update](http://www.w3.org/TR/sparql11-update/)
* [SPIN SPARQL vocabulary for RDF](http://www.spinrdf.org/sp.html)

Magnode uses its own SPIN implementation at [github.com/Acubed/sparql-spin-js3](https://github.com/Acubed/sparql-spin-js3)

### RDFa

Data embedding/API standards:

* [RDFa](http://www.w3.org/TR/rdfa-core/) (as opposed to the older _rdfa-syntax_ spec)
* [RDFa Templates](http://magnode.org/rdfa-templates/)

There are several implementations:

* JSDom (an implementation on top of the Document Object Model)
* RDFa for Jade (a native extension of Magnode's Jade processor)

### Data Access APIs

The data access APIs are important because they provide the core of the method of querying and manipulating RDF data, no matter what the database backend.

* [RDF Interfaces](http://www.w3.org/TR/rdf-interfaces/)
* [RDF API](http://www.w3.org/2010/02/rdfa/sources/rdf-api/) (Editor's Draft)
* [RDFa API](http://www.w3.org/TR/rdfa-api/)

### Javascript

MongoDB uses a JSON variant named BSON, magnode stores schemas for MongoDB collections as a JSON Schema.

* [JSON Schema](http://tools.ietf.org/html/draft-zyp-json-schema-04) (the latest version, currently 04)
