# Magnode

Magnode is a framework and application that manages and formats dereferenced resources. In layman's terms, it's a content management system.

It's designed to cover a broad spectrum of use cases, including blogs, wikis, databases, user accounts, custom resource types, Content-Type negotiation, full HTTP support, static websites, and more.

## Information

The place to get information is <https://magnode.org/>.

Information on new releases is published on <https://groups.google.com/group/magnode>. You should subscribe to that mailing list to get updates on the latest releases and upgrade information.


## Installation

For complete documentation, see the documentation in docs/ or online at <https://magnode.org/doc/setup>.

Configure dependencies:

	$ git submodule update --init

Run setup:

	$ MAGNODE_MONGODB='mongodb://localhost/magnode' ./httpd.js --setup

Done!

