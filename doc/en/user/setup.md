## Setup

Currently Magnode demands some knoweldge of ECMAScript/Javascript coding, MongoDB databases, website design, and webserver setup. These needs should be reduced down to the bare minimum as development proceeds (configuration of the webserver).

### Import content to MongoDB

If you're using MongoDB as the primary content store (effectively the only option at the moment), then you'll need to create and populate a database with some data. First, import the collections, indexes, and the critical MongoDBJSONSchema resource. Then, import the schema for user accounts (mongodb-OnlineUser.json).

<pre><code>
$ cd setup
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb.json
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb-OnlineUser.json
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb-Page.json
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb-Post.json
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb-List.json
$ ./import-mongodb.js [options] -d <i>magnode</i> -f mongodb-frontpage.json
</code></pre>

where _options_ may be <code>-h <i>localhost</i></code>, <code>-u <i>username</i></code>, and _magnode_ is the name of the database you wish to import to. Use `-p -` if to supply a password. Use `./import-mongodb.js -?` for the complete list of options.


### Setting up users

To create a blog, we will be looking to create a basic website where you can make _posts_, that have an _author_, _creation date_, _body_, and _title_. Additionally, we will want to create static pages with just a body, and we will want to have menus along each webpage with menu items that can point to a list of recent blog posts and particular pages. We will also need user authentication.

<pre><code>
$ ./mongodb-account.js [options] -d <i>magnode</i> -f mongodb-frontpage.json
</code></pre>

#### Basic setup

Install Magnode as specified in the "Installation" section.
