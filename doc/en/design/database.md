## Database

Magnode is largely database-agnostic. Individual transforms largely don't care what kind of content they're transforming or how they're getting it from the database. Transforms may utilize a database connection to generate output, this is used particularly for generating output from RDF resource inputs, where a query made on an RDF store for that RDF resource is made. Other types of databases may be used, like a document store.
