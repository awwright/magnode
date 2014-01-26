## Semantics

Magnode extends functionality using _semantics_, RDF statements that define new link relations that existing code can use. These may be bundled together with other assets like templates, media, and code, into a _package_.

For example, if you want to add a message board to your website, to form a community, that means you want people to be able to post a new type of content (the forum thread, and forum post), and you need to be able to format and display that new type of content.

To do so, you install the semantics that tells Magnode how it all works.

Semantics files are distributed as RDF files and simply loaded into the database as a named graph. The graph can be kept synchronized and up-to-date in this manner.
