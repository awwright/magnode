## Setup

Currently Magnode demands some knoweldge of ECMAScript/Javascript coding, MongoDB databases, website design, and webserver setup. These needs should be reduced down to the bare minimum as development proceeds (configuration of the webserver).

This will demonstrate how to setup Magnode to host a basic blog-like website with static pages, and named and dated posts. This involves setting up user accounts and authentication, the site theme, the database, and navigation menus.

Remember to replace `example.com` with the name of your own site. If you're just testing, you can call it `localhost`.


### File setup

Magnode should already be installed on your system. For instructions on how to perform setup, see the Installation chapter above.

After Magnode has been installed, setup a place to place website resources:

	$ mkdir -p sites/example.com/{node_modules,template,www}

Then create the script that will run the HTTP server. See the "Framework Setup" section for a sample script. Paste it into a new file and edit as necessary with your favorite editor:

	$ $EDITOR sites/example.com/httpd.js


### Setting up the theme

We need to provide some data that'll explain how the page is rendered.

Throw this in a file named `sites/example.com/format.ttl`

	@base <http://magnode.org/> .
	@prefix view: <http://magnode.org/view/> .
	@prefix Transform: <http://magnode.org/transform/> .
	@prefix type: <http://magnode.org/> .


	# Page theme

	Transform:DocumentHTML
		a view:Jade, view:Transform, view:FormTransform, view:ViewTransform ;
		view:file "template/DocumentHTMLDefault_typeDocumentHTML_Body.jade" ;
		view:domain type:DocumentHTML_Body, type:DocumentHTML_Body_Block_UserMenu, type:DocumentHTML_Body_Block_MainMenu ;
		view:range type:DocumentHTML, type:Document .


	# Main menu

	Transform:DocumentHTML_Body_Block_MainMenu_typeMenu_MainMenu
		a view:Transform, view:FormTransform, view:ViewTransform, view:ModuleTransform ;
		view:module "magnode/transform.DocumentHTML_BodyBlock_typeMenu" ;
		view:domain type:Menu_MainMenu ;
		view:range type:DocumentHTML_Body_Block_MainMenu .

	Transform:Menu_MainMenu_typeDocument
		a view:Transform, view:FormTransform, view:ViewTransform, view:ModuleTransform ;
		view:menuItemContentTypes type:Raw, type:Page;
		view:module "magnode/transform.Menu_typeDocument" ;
		view:range type:Menu_MainMenu .


	# User menu

	Transform:DocumentHTML_Body_Block_UserMenu_typeMenu_UserMenu
		a view:Transform, view:FormTransform, view:ViewTransform, view:ModuleTransform ;
		view:module "magnode/transform.DocumentHTML_BodyBlock_typeMenu" ;
		view:domain type:Menu_UserMenu ;
		view:range type:DocumentHTML_Body_Block_UserMenu .

	Transform:Menu_UserMenu_typeUserSession
		a view:Transform, view:FormTransform, view:ViewTransform, view:ModuleTransform ;
		view:module "magnode/transform.Menu_typeUserSession" ;
		view:domain type:UserSession ;
		view:range type:Menu_UserMenu .

This refers to a file named `template/DocumentHTMLDefault_typeDocumentHTML_Body.jade` that'll render the complete HTML page out of an HTML body. It is specified relative to the `httpd.js` script. Fill it with some content:

	!!!strict
	html(lang="en")
		head
			meta(http-equiv="Content-Type", content="text/html; charset=utf-8")
			title Magnode: Power Over Data
			link(rel="stylesheet",href="http://magnode.org/theme/fixed/theme/theme.css")
		body
			.head-base
			.wrapper
				.body!=input["http://magnode.org/DocumentHTML_Body"]
				.head
				.panel
					div!=input["http://magnode.org/DocumentHTML_Body_Block_MainMenu"]
					div!=input["http://magnode.org/DocumentHTML_Body_Block_UserMenu"]
				.foot
					hr

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
