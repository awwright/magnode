## Content

The basic building block of Magnode is the resource. A resource is anything that can be identified by a URI, like a scientific paper, a blog post, a product for sale, or a figurine in your model dragon collection. Resources in Magnode are in the style of RDF Resources. The URI by which resources are uniquely identified is called their _subject_. Resources may be described any number of ways in Magnode, primarially with a document in a document store like MongoDB, or statements in an RDF store.

Descriptions of resources are generally schemaless and may include any number of properties. The most important property in Magnode is the _type_. Using the type property, content can be stored as an _instance_ of any number of classes. It identifies the certain properties that the resource carries. You typically create a class for a collection of resources that share common properties that you want to describe. For instance there would be types for a blog post, a song, or a revenue report. Types can be used to describe any aspect of the resource's membership in something, for instance, to tag a resource of type Song into Rock, Country, or Trance.

As a matter of convention, property names are all lowercase, and all other resources are named with UpperCamelCase.

In Magnode, absolutely everything is described as a resource. Properties themselves are resources. Users are described as resources. Classes/content types are resources. The HTTP server of a running Magnode instance, database connections, and individual transform functions can be addressed as resources. Most of these resources are URLs, a particular type of URI that can be _dereferenced_, or retreived over the network. While you can't literally download the concept of a scientific paper, you can download a particular _representation_ of it. These representations are usually HTML documents, though they may also be Turtle-encoded RDF graphs, a .png image of a plot of a time series, or a .pdf or .epub file that can be downloaded for printing or viewing on an E-reader. Each of these representations are themselves resources, and get their own URI. Magnode selects one of the representations to return, generates it, and sends it back along with the URI of the representation, so that the web browser knows where it may retreive that particular representation in the future.

For instance, open up the definition of a Page: Given a running instance of Magnode listening to localhost on the default port 80, open up `http://localhost/type:Page?edit` in your favorite browser. These properties describe the resource so Magnode might know how to format resources that are tagged with a type _Page_.

Notice that the type of Page itself is listed as `http://magnode.org/MongoDBJSONSchema`. When you request Page in your web browser, Magnode looks through a database of functions that can convert content of one type into another, and tries to string together a series of functions that'll create a finished HTML webpage that can be delivered to your web browser. The complete list of functions can be found at `http://localhost/about:transforms`

When you want to create a new instance of a class, you can navigate to the page with ?new: `http://localhost/Page?new`. This creates a new instance of a resource in memory, and brings up a form to edit it, to submit and save in the database.

### Retreiving Content

Magnode is a framework that formats RDF resources, which are identified by URIs. When dereferenced (that is, accessed), magnode uses a series of _transforms_ to convert the RDF resource of whatever type it is, into a content type requested by the browser (usually HTML). In some cases you may want Magnode to format a resource that it is not the server for, for instance, the `rdfs:Class` resource which has a uri of `http://www.w3.org/2000/01/rdf-schema#Class`. If the URI were to be dereferenced, it would make an HTTP GET request to `www.w3.org` for the resource `/2000/01/rdf-schema`. If you want to ask `example.com` how it would format the resource, you can specify the shortened URL after the domain name part of the URI like so: `http://example.com/rdfs:Class`. URIs with hashes can be formatted in the same manner.

Which transforms are applied can be controlled with the `?apply=` paramater, which can be used any number of times, each with a different value that specifies the transform to apply to the requested resource.

### How resources are applied

Magnode keeps a list of objects with their content types, and uses transforms to create new objects with new content types. It keeps applying transforms until the target content type is generated.

<dl>
<dt>resource</dt> <dd><code>http://magnode.org/2011/05/25/welcome-to-magnode</code></dd> <dd>(Provided)</dd>
<dt>database</dt> <dd><i>Object</i></dd> <dd>(Provided)</dd>
<dt>type:Blogpost</dt> <dd><code>http://magnode.org/2011/05/25/welcome-to-magnode</code></dd> <dd>(Implied from <i>resource</i>)</dd>
<dt>type:DocumentHTML_Body</dt> <dd><code>&lt;p&gt;Thank you for flying Magnode!&lt;/p&gt;&lt;div class=&quot;author&quot;&gt;Authored by Acubed on 2011-05-25 13:42&lt;/div&gt;</code></dd> <dd>(Generated by <code>transform:DocumentHTML_Body_typeBlogpost</code> from <i>type:Blogpost</i> and <i>database</i>)</dd>
</dl>


### Editing Content

Passing the `?edit` parameter will change the transforms allowed to be applied from readonly transforms to editable-form transforms (transforms that can process both types, like HTTP, are members of both types). This will cause an editable form to be displayed.

### Creating Content

The `?new` parameter on a URL will cause Magnode to format an empty resource of a type of the given URL. For instance, requesting `http://example.com/rdfs:Class?new` will cause Magnode to create a blank, new resource, and format it as a rdfs:Class.
