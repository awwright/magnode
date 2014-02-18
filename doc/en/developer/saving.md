## Saving Data

Most data is saved by defining a PUT request - everything else is defined in terms of these PUT requests. For instance, PATCH executes a GET, modifies the resource according to the upload data, then PUT back to the database. Browser form POST submissions and POSTs to create items in a collection are rewritten into a PUT request. Custom POST and CONNECT scripts may interact with data sources however they like, however it is often easier simply to execute a PUT request internally.

PUT behaves unlike most other methods, instead of first fetching a resource by its URI, the resource identified in the request is uploaded to the server, and asked to store it at a given URI. For this reason, PUT will never return 404 (Not Found) nor 410 (Gone).

PUT requests are handled using the internal transform system to convert the uploaded entity-body into a form suitable for database storage. The incoming type is defined based on the content's media type, and it is turned into an HTTPResponse which (as a side effect) saves the resource to the database. However instead of invoking transforms with the `GetTransform` relation, only `PutTransform` transforms are invoked.
