## Namespaces

Namespaces are used to specify settings and behavior that should only be present under certain URI patterns, typically specific hostnames/domain names or paths/hierarchies.

The primary purpose of a namespace is "multi-site" configuration, by specifying which themes and data sources to query based on the host.

Namespaces are also used to specify which database tables/collections are to be queried, for instance, that a path starting with `/post/` will refer to a resource defined in the "posts" table of the database.
