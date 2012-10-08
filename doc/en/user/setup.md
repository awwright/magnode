## Setup

Currently Magnode demands some knowledge of ECMAScript/Javascript coding, MongoDB databases, website design, and webserver setup. These needs should be reduced down to the bare minimum as development proceeds (configuration of the webserver).

This will demonstrate how to setup Magnode to host a basic blog-like website with static pages, and named and dated posts. This involves setting up user accounts and authentication, the site theme, the database, and navigation menus.

Remember to replace `example.com` with the name of your own site. If you're just testing, you can call it `localhost`.


### Installer setup

The easiest way to get setup is to use the installer. After you have followed the installation, navigate to the main directory and run the following command:

	$ ./setup/setup-blog.js

This will ask you a few questions about the site you want to create:

<dl>
<dt>Machine name</dt><dd><p>The short name. This should be lowercase, without any spaces. Perhaps you want to use the domain name of the website, (e.g. <code>magnode.org</code>), or accept the default of <code>localhost</code>. This name will be used to copy files into <code>sites/<i>name</i></code></p></dd>
<dt>MongoDB connection</dt><dd><p>The login information to connect to the MongoDB server. This may include a username and password in the format of <code>username:password@hostname:port</code>. Or just press enter to accept the default of <code>localhost</code>.</p></dd>
<dt>Mongodb database</dt><dd><p>The name of the database on the MongoDB server to use. This will be created and loaded with data.</p></dd>
<dt>Website Base URL</dt><dd><p>The base HTTP URL of the website you'll be using. This must be an absolute URL, must contain a trailing <code>/</code>, and should start with <code>http://</code>, even if you're using https.</p></dd>
<dt>Superuser id</dt><dd><p>The resource identifying the site superuser. You should accept the default of <code>/user/root</code>.</p></dd>
</dl>

Accepting the final prompt will install files to the sites directory, and import content into the database.

You'll now want to add a user. Run;

<pre><code>$ ./setup/mongodb-account.js <i>&lt;options&gt;</i> --create --resource <i>&lt;superuser&gt;</i> --username root</code></pre>

Where <i>db-options</i> is <code>-d <i>database</i></code> and (if necessary) <code>-h user@pass:host:port</code>, and where superuser-id is the Superuser id from the setup program. You may also provide <code>--random-password</code> to generate some random password. If not, enter a password for the new account when prompted.

Finally, you'll need to setup the theme. See "Setting up the theme" below.

The webserver can now be started by running <code>./sites/localhost/httpd.js</code>.


### File setup

Magnode should already be installed on your system. For instructions on how to perform setup, see the Installation chapter above.

After Magnode has been installed, setup a place to place website resources:

	$ mkdir -p sites/example.com/{node_modules,template,www}

Then create the script that will run the HTTP server. See the "Framework Setup" section for a sample script. Paste it into a new file and edit as necessary with your favorite editor:

	$ $EDITOR sites/example.com/httpd.js


### Using a theme

A theme is a set of transforms/templates that handles the final step of assembling the finished HTML document, and provides auxiliary files like CSS and JS files for web browsers. In order to use the default theme that ships with Magnode, you must enable it with some statements on how to use it.

Locate `setup/example-blog/format.ttl` and copy it to `sites/example.com/format.ttl`. Open in your favorite editor and edit the @base directive on the first line to match your website:

	$ cp setup/example-blog/format.ttl sites/example.com/format.ttl
	$ $EDITOR sites/example.com/format.ttl

In this example, it would look like:

	@base <http://example.com/> .


### Import content to MongoDB

If you're using MongoDB as the primary content store (effectively the only option at the moment), then you'll need to create and populate a database with some data. First, import the collections, indexes, and the critical MongoDBJSONSchema resource. Then, import the schema for user accounts (mongodb-OnlineUser.json).

<pre><code>$ ./setup/import-mongodb.js [options] -d <i>magnode-blog</i> \
   --base 'http://example.com/' \
   setup/data/mongodb-{base,OnlineUser,Page,Post,List,frontpage}.json
</code></pre>

where _options_ may be <code>-h <i>localhost</i></code>, <code>-u <i>username</i></code>, and _magnode_ is the name of the database you wish to import to. Use `-p -` if to supply a password. Use `./import-mongodb.js -?` for the complete list of options.


### Setting up users

After setting up the database, we'll need to fill it with some content, beginning with users who can login.

<pre><code>$ ./setup/mongodb-account.js [options] -d <i>magnode-blog</i> \
   --create --resource 'http://example.com/user/root' \
   --username root --random-password
</code></pre>


### Running the server

In the main directory, run:

	$ node sites/example.com/httpd.js --port 8080

Then pull up http://localhost:8080/ in your favorite web browser.
