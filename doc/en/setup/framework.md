## Framework Setup

Magnode can be used as a framework, where most of a website's functionality is defined programmatically, instead of by database.

You will need to setup the library calls to get Magnode functioning as an application. This will need to include:

* Database connection
* RDF environment
* Authentication
* Authorization
* Create render and import transforms
* Routing URLs
* Listening to ports

The installer script currently works this way to produce an `httpd.js` file, the source for a basic framework-application can be examined at `setup/example-blog/httpd.js`.

For information about how to setup Magnode as a framework, see the [Developer's Guide](#developer) and the [API Documentation](#api).
