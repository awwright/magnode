## Setup

Magnode is designed to be setup with the provided setup script. It can also be setup by hand. For details, consult the developer documentation, API documentation, and the database installer source code.

The installer sets up a basic blog-like website with static pages, users, and named and dated posts.

Remember to replace `example.com` with the name of your own site. If you're just testing, you can call it `localhost`.

After you have installed the files to the system, navigate to the main directory. If `httpd.js` and `format.ttl` do not exist, copy them:

	$ cp -a setup/example-blog/* ./

Then run the following command at a prompt:

	$ ./httpd.js

If the configuration file `server.json` does not exist, the setup process will begin to write it. A custom configuration file may be provided with `-c server.json`.

Aim your web browser at the provided setup URL, and don't forget to replace `localhost:8080` with the appropriate authority, if you have setup Magnode behind a gateway or on a different host.

This will ask you a few questions about the site you want to create. When prompted, stop the process with `^C`, a.k.a. `Ctrl+C` (on most shells), and restart it. Then proceed to the front page or login page.

For running a public website, you will probably wish to run `httpd.js` as a service. Consult your operating system distribution for information on doing this.


### Reset or import additional content to MongoDB

If you want to install or reset content in the database, the import-mongodb script can do this. At a prompt run, for example:

<pre><code>$ ./setup/import-mongodb.js [options] -c <i>server.json</i> \
   setup/data/mongodb-{<i>Post,Page</i>}.json
</code></pre>

where _options_ may be a number of command line arguments, use `./import-mongodb.js -?` to see the complete list. To read from the configuration file, use `-c _server.json_` where _server.json_ is the location of your configuration file.
<i>setup/data/mongodb-Post.json</i> and <i>setup/data/mongodb-Page.json</i> are two examples of content that you may wish to re-import. Files from this directory represent lists of documents and/or indexes to be created in MongoDB. Any string beginning with "http://localhost/" is converted to the URL specified by the --base argument. Objects of the form `{"$ObjectId":"(hex)"}` are converted to a MongoDB ObjectId.


### Creating more users

The installer will have created a root user with a random password. More users may be created, or password reset, using the mongodb-account script:

<pre><code>$ ./setup/mongodb-account.js [options] -d <i>magnode-blog</i> \
   --create --resource 'http://example.com/user/root' \
   --username root --random-password
</code></pre>
