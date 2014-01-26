## Principles

What are the foundations that Magnode is built on top of?


### Use good Web principles

Use URIs to describe resources and use HTTP to communicate the state of those resources and operate on them. Client-side scripts should be RESTful, meaning they should degrade gracefully.


### Expose a network layer to manipulate resources

Build on top of other Internet technologies to expose Web functionality: HTTP dereferences and manipulates resources. Above the HTTP layer, media types are used instead of protocols.


### Security then efficency

Security is a very high bar to set: The program not only has to support all the required functionality, but it has to not do all the things it's not supposed to do.

If in doubt, security comes first. If desirable or unnecessary, security can be turned off, but Magnode must not pretend it is operating securely.


### Suppport all kinds of data sources

Magnode should be able to use everything from memory, to flat files, to embedded databases, to huge, dedicated databases. They're all resources in the eyes of HTTP.


### Promote accessability and data portability

Accessability means designing websites that are consumble by Web browsers, graphic renderings, mobile devices, screen readers, printed media, Web spiders, coupled RPC-like clients, and more.


### Self-documenting

The goal is to make a software program that is self-documenting, intuitive, and works with sensible, but configurable, defaults. Resources, where appropriate, should be both computer- and human-readable.
