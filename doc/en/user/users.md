## Users

Setting up user authentication and permission (authorization).

Any content that is already in memory does not require a permission check to be used by a transform function. However, any database references, calling methods on an input object, anything that needs to go over the network, or any function call that can only be performed once per request, requires a permission check.

A permission check is done by asking a number of drivers: Can a certain type of action be performed on this set of resources? Each permission check generally has a unique action id associated with it, and the resources are typically the resources to a transform, including the active user session and resource being acted on.

Permissions are considred open-world, and cannot be blacklisted, only whitelisted.

By default, any content with a type of `http://magnode.org/Page`, `http://magnode.org/Post`, or `/Published` (relative to your site base) is made visible to the world without permissions. Likewise, there is a root user whose permission requests are always granted.

The MongoDB Usergroup driver allows granting permissions to members of certain user classes, to make certain operations on certain types of resources.

If you need to reset a password, use the _mongodb-account_ program as described in the "Setup" section, or see `./setup/mongodb-account --help`.
