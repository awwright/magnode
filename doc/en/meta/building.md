## Building

Building is done with the `doc/build.js` application shipped with magnode. It is an implementation of the Magnode framework that generates static HTML files.

### Transforms
Several transforms are provided to generate RDF resources from the raw documentation files. These are used by the build utility to generate static files, and may be used by the application server to render documentation as part of the Magnode website.

 * API data
 * Git commit data
 * Tutorial/markup file data
 * API method transform
 * API module transform
 * Tutorial document transform
 * HTML Document body transform
