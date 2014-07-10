## The Webserver

Magnode fully levereges the design of HTTP to format resources into various media types when they are dereferenced.

HTTP has numerous features which are described across many different documents. Here we attempt to describe how to implement all of them into a single coherent program.


### Authorization Checking

Any time during a request when we perform an action, we must check to see that the action being performed is within the set of permissions granted by the credential. In this case, a credential might also be “anonymous user” and the default permissions that every request has. We will assume this check is performed whenever access needs to be controlled or restricted.

Each instance of a permission check in the code should have a unique permission name, and may also optionally check for a generic permission like “read” or “edit”. While most permissions granted will be for these groups of permissions, it may be necessary to grant permissions to a specific instance check.

A permission should accept arguments for every dimension that you would want to control access along - typically this means the resource being accessed or modified, if the user is also the owner of the resource, and classes that the resource is an instance of or a member of, including if the resource is in a “published” state or not.

A sandbox of permissions might look something like:

* view[document] | document.owner=credential.user
* view[document] | document.status=published
* put[document] | document.owner=credential.user, document.type=BlogPost
* put[document] | document.owner=credential.user, document.type=Comment

Where the pipe “|” means “where”, and the equals sign “=” means equality.

@@@TODO polish up the set theory, we want to ensure that people who shouldn’t have access don’t inadvertently get it if we make changes to the permission schema, which may happen frequently (maybe they become able to set the owner to someone besides themselves, etc)

Which means that the current user can edit and view any resource that they own, they can create resources that they are the owner of, and they can view any published content.

With this set of credentials, they would likely not be able to change their own password or other personal information - this should require an additional permission like editCredentials[]

Actions are verified as follows:

1. Look up the set of actions granted to the credential
2. Check that the requested action is within the set of actions
3. If the check fails:
	1. Terminate any handling of the request
	2. Fail any write transactions associated with the request
	3. Return 401 (Unauthorized). Additional information should not be returned, though it should be logged away for debugging and auditing purposes, and a log id may be returned.


### Selecting a Representation

The task of negotiating and rendering a variant is one of the core functions of Magnode. But the process isn't so straightforward.

When resource is dereferenced:

1. Determine the database resource identified in the URI and calculate its direct link, suitable for a rel="about" link.
2. Parse the URI to determine the subset of variants that may be returned. Variants can vary by many dimensions:
	* Language
	* Charset
	* i18n options (timezone, maybe number formatting)
	* Pagation offset, length
	* Content-Type (html, json, xml, markdown, docbook, etc)
	* Content-Type arguments (profile, XForms, SVG, etc)
3. Use the Accept headers and configuration information to select a variant from the remaining set. Return it to the client.


### Serving a Request

An HTTP server needs to satisfy a great number of requirements as laid out in the HTTP specification.

1. If desired, setup a timer to respond with 408 (Request Timeout) and kill the connection, to close old, lingering TCP connections.
2. Return with 505 (HTTP Version Not Supported) here if appropriate
3. If desired, and if the server is marked offline or the request would bring the server over capacity (particularly non-safe, non-cachable requests), return 503 (Service Unavailable).
4. If no Host request-header is provided, return 400 (Bad Request) (required per 14.23)
5. If there is a Content-Type request-header, then:
	1. If the Content-Type request-header indicates a media type which cannot be handled by the server, return 415 (Unsupported Media Type)
	2. If a Content-Length request-header is desired from the client but not provided, return 411 (Length Required)
	3. If the Content-Length header is provided and indicates a larger than acceptable upload, return 413 (Request Entity Too Large)
6. Parse the Expect request-header and return 417 (Expectation Failed) if an unknown symbol is found (100-continue should be the only known symbol and will always be handled, either by Node.js itself or a custom registered callback) (required per 14.20)
7. If the request URI line is longer than acceptable, return 414 (Request-URI Too Long)
8. Parse the request-line URI, using the Host header as appropriate
9. If the client asked for 100-continue, return 100 (Continue), as at this point all the headers have been verified as acceptable to us so far as we know. This must be specifically enabled, otherwise Node.js will automatically always respond with 100-continue, which is not desirable for performance reasons.
10. Setup buffering of incoming entity-body data, if any, handling incoming data with logic to:
	1. If more data is uploaded than expected, kill the connection (as it has been dishonest)
	2. If more data is uploaded than acceptable, return 413 (Request Entity Too Large) with `Connection: Close`
	3. If if the request method is TRACE, or if there is no Content-Type header, return 400 (Client Error)
11. Authenticate credentials, if provided and desired
12. Process request based on method:
	1. Resourceful methods (GET, HEAD, OPTIONS, PATCH, CONNECT, POST):
		1. Dereference the resource being identified
		2. If no such resource exists, return 404 (Not Found)
		3. If the resource is in a “deleted” status, return 410 (Gone)
		4. Process depending on the method (see below)
	2. PUT: see “PUT request” below
	3. TRACE: handle meta-request if desired (this has security implications where user credentials may be leaked to a third party script, so reply with 501 for now)
	4. Unknown method: reply with 501 (Not Implemented)


### GET request

The GET request is most commonly used method, and frequently called as a subroutine from other methods.

The GET method accepts a "HEAD" flag for HEAD requests (see "HEAD request" below).

1. Let _resource_ be the dereferenced information resource or the closest available representation like a database row, if a rendered information resource (like an HTML document) isn’t available.
2. If _resource_ resolved to a data/non-information resource like a database row, then
	1. Determine what variant to encode the resource into, using Content-Type negotiation (the Accept request-headers)
	2. Determine the URI of the serialized, information resource (e.g. append “.json” to the URI, depending on how you mint URIs) and set this in the “Content-Location” response-header
	3. Set the “Vary” response-header based on the headers used to select a representation
3. If necessary, format _resource_ into the requested variant
4. If the If-None-Match or If-Unmodified-Since request-headers match against the resource, return 304 (Not Modified).
5. If a HEAD request, return 200 (OK) with a blank entity body
6. Else apply Range and If-Range request-header semantics as necessary, return 206 (Partial Content) or 416 (Requested Range Not Satisfiable) as appropriate
7. Else return 200 (OK) with _resource_

HTTP requests are atomic, which means the GET request must operate on a snapshot of the data at one point in time, which can be achieved by designing your data store to work in atomic transactions, or failing that, the PUT request must lock out GET requests while the transaction is active.

Note that as specified in the “Authorization Checking” section, and as with all other methods, authorization checking is implicitly performed as a part of these steps, and an authorization failure will abort the steps and return 401 (Unauthorized).


### HEAD request

The HEAD request is identical to the GET request, except no entity-body is returned. The Content-Length header, if any, is left intact - clients are supposed to know there is no response entity-body despite it’s presence.

1. Calls the GET method, but enable a “HEAD” flag to disable writing of the response (Node.js will do this automatically, but print a warning to the console stderr).


### OPTIONS request

The OPTIONS request is used for returning meta-data about a resource. There is no particular standard for how the response entity-body is encoded, but consider generating an array of the acceptable methods, and using the same GET functionality to format it into an HTML or JSON response (you may even wish to provide this resource a URI and return a Location header).

OPTIONS is also used for the “CORS pre-flight check”. If your application is secure, it will also be secure with `Access-Control-Allow-Origin: *` but you may wish to configure the response to your preferences.

1. Set the Allow response-header with the acceptable methods:
	* GET, HEAD, OPTIONS
	* If the resource can be written to, PUT, PATCH, and DELETE
	* If the resource is a script, POST
	* If the resource is a tunnel, CONNECT


### POST request

The POST method executes the dereferenced resource, identified in the request-URI, and returns its result as a new resource. The script itself will often be a different resource than the form used to execute it or the actual resource that the script will modify, so it should get a different URI (which may just mean appending `?action=edit` to the URI).

The request may generate multiple resources, like a new page or comment. In this case, the result of the script will be to redirect the user-agent to the created resource with a 303 redirect.

1. Dereference the resource according to GET above
2. If dereferenced resource is not a script
	1. Include Allow header as specified in "OPTIONS request" (required per 10.4.6 and 14.7)
	2. Return with 405 (Method Not Allowed)
3. Execute resource as a script/program
4. If the script starts an ongoing, long-running process, then:
	1. Create a named resource representing the process
	2. Link to the process in the Location header
	3. Return 202 (Accepted)
5. Else
	1. Set status code 200 (OK), or 303 (See Other) as appropriate.
	2. Return result of execution as a new, anonymous resource (which may involve redirecting to other newly created resources).

The most significant use of POST requests is to execute other requests that Web browsers may not have semantics for, e.g. making a PUT request. Such a script might be called with with `method="post" action="?put"` in an HTML form tag, and might and look something like:

1. Parse the request-entity body and format it into an application/json document
2. PUT the document to this URI, but with "?put" removed (if it exists in the URI)
3. If successful, 303 redirect to the URI that was PUT to (which the Web browser will request with GET per 303 semantics)
4. Else if failure, pass on the fail status code and print an HTML error message


### PATCH request

The PATCH request dereferences a resource, applies modifications as specified in the request entity-body, and re-saves the resource back to the database in a PUT request.

This method was removed from HTTP for a little while, however it became clear it has slightly different semantics than POST, and so was added back in with RFC 5789.

1. Dereference the resource according to GET above
2. Modify the dereferenced resource’s entity-body according to semantics of the request-entity-body Content-Type
3. Save the modified resource back to the database with a PUT request, with If-Match as appropriate


### DELETE request

Removes a resource from the database.

1. Test the If-Match and If-Unmodified-Since headers, return 412 (Precondition Failed) if the headers are specified and do not match
2. Remove the resource from the database (no, really?)
3. Return 200 (OK)

The status code to return for DELETE has been the subject of some debate on the various mailing lists, because it is an idempotent operation. However, it is of no harm to indicate to the client what particular effect or change the request had. So note that because DELETE is a “resourceful” request, this subroutine will never be called if the resource doesn’t exist, but instead will return 410 (Gone) or 404 (Not Found) as appropriate.

### CONNECT request

The CONNECT request effectively ends HTTP communications on the TCP connection and starts a tunnel. It acts similar to STARTTLS in other protocols. It still accepts a request URI, which identifies the resource to open bi-directional communications with. This resource has typically been a remote server, but could also be an interactive program.


### PUT request

The put request takes a resource in the request-entity body and stores it at the indicated request-URI. It works even if there is no resource present, and so will never return 404 (Not Found).

Again note that, as specified in the “Authorization Checking” section, authorization checking is implicitly performed as a part of these steps, and an authorization failure will abort the steps and return 401 (Unauthorized).

1. Determine where to save the resource, and what data type to save it as, based on incoming media-type and namespace in URI
	1. If the request is invalid or out of range, respond with 400 (Client Error)
2. Open a database transaction or lock the resource at the URI
3. Verify that the If-Match, If-None-Match, If-Modified-Since, and If-Unmodified-Since headers are consistent with the resource at the URI (or lack thereof), if not, return with 412 (Precondition Failed)
4. Format the uploaded resource into a form suitable for storage, like a database row. If this is not possible due to a limitation of the media type (for instance, the media type doesn’t contain all the information necessary to process the request, maybe it’s HTML formatted), respond with 415 (Unsupported Media Type).
5. Save the data resource into the database where it can be retrieved at the request URI
6. Commit transaction
7. Respond with 201 (Created) or 200 (OK) as appropriate


### Application Server

The main purpose of the application server is to allocate and wire together process-level resources.

In Magnode, this can all be done dynamically at runtime by creating instances of resources in the database. The database connection information is passed in out-of-bound at init-time.


### Scripting

But this is not the extent of the power that Magnode holds, the transform engine can be used by itself to create static websites. Magnode is a framework that can be used with hand-coding, for projects where a CMS frontend is not desired, or for generating static content, or serving resources over a protocol other than HTTP (like emails or SSH, for instance).

This is not considered essential setup information and is kept with the [API Documentation](#api).


### Queries

A query engine can be created by parsing a natural language query into URIs, into a formatted response. By breaking down a natural language query into a structure of resources, Magnode can parse the query into resources based on the resource's associated metadata like their `rdfs:label`. The resources are then examined for any special logic handlers on how to handle sibling or child resources, and given the oppertunity to return a resource return-value. After all executed, the resource(s) are transformed into a formatted result set.

