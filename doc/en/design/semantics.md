## Semantics
Magnode extends functionality using _semantics_. Other software programs let you extend functionality using "modules", "extensions", "themes", "packages", and so on. In Magnode, extensions as such aren't used, but instead you install data that tells Magnode how to handle certain types of data or events.

For example, if you want to add a message board to your website, to form a community, that means you want people to be able to post a new type of content (the forum thread, and forum post), and you need to be able to format and display that new type of content.
To do so, you install the semantics that tells Magnode how it all works.

Semantics files are distributed as RDF files and simply loaded into the database as a named graph. The graph can be kept synchronized and up-to-date in this manner.
