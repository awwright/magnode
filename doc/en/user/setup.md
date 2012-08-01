## Setup

### Application

Magnode ships with an application, `magnode.js` which loads a runtime configuration from a database as a standard content management system application. In the magnode directory, run:

	$ ./magnode.js

Then navigate your web browser to `http://localhost:8080/` to begin setup.

### Setting up users

To create a blog, we will be looking to create a basic website where you can make _posts_, that have an _author_, _creation date_, _body_, and _title_. Additionally, we will want to create static pages with just a body, and we will want to have menus along each webpage with menu items that can point to a list of recent blog posts and particular pages. We will also need user authentication.

#### Basic setup

Install Magnode as specified in the "Installation" section.
