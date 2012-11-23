## Setup

Magnode is designed to be setup with the provided setup script. It can also be setup by hand. For details, consult the developer documentation, API documentation, and the database installer source code.

The installer sets up a basic blog-like website with static pages, users, and named and dated posts.

Remember to replace `example.com` with the name of your own site. If you're just testing, you can call it `localhost`.

After you have installed the files to the system, navigate to the main directory and run the following command at a prompt:

	$ mkdir sites
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

The webserver can now be started by running <code>./sites/localhost/httpd.js</code>. Visit http://localhost:8080/login and login with username "root" and the password displayed at the end of the setup.


### Import content to MongoDB

If you want to install or reset content in the database, the import-mongodb script can do this. At a prompt run, for example:

<pre><code>$ ./setup/import-mongodb.js [options] -d <i>magnode-blog</i> \
   --base 'http://example.com/' \
   setup/data/mongodb-{Post,Page}.json
</code></pre>

where _options_ may be <code>-h <i>localhost</i></code>, <code>-u <i>username</i></code>, and _magnode_ is the name of the database you wish to import to. Use `-p -` if to supply a password. Use `./import-mongodb.js -?` for the complete list of options.


### Creating more users

After setting up the database, we'll need to fill it with some content, beginning with users who can login.

<pre><code>$ ./setup/mongodb-account.js [options] -d <i>magnode-blog</i> \
   --create --resource 'http://example.com/user/root' \
   --username root --random-password
</code></pre>


### Running the server

In the main directory, run:

	$ node sites/example.com/httpd.js --port 8080

Then pull up http://localhost:8080/ in your favorite web browser.
