## Users

Setting up user authentication and permission (authorization).

Any content that is already in memory does not require a permission check to be used by a transform function. However, any database references, calling methods on an input object, anything that needs to go over the network, or any function call that can only be performed once per request, requires a permission check.

A permission check is done by asking a number of drivers: Can a certain type of action be performed on this set of resources? Each permission check generally has a unique action id associated with it, and the resources are typically the resources to a transform, including the active user session and resource being acted on.

Permissions are considred open-world, and cannot be revoked if the permission is granted by another rule.

By default, any content with a type of `http://magnode.org/Page`, `http://magnode.org/Post`, or `/Published` (relative to your site base) is made visible to the world without permissions. Likewise, there is a root user whose permission requests are always granted.

Other users can inherit permissions by being members of a _usergroup_. The MongoDB usergroup driver provides support for this.

If you need to reset a password, use the _mongodb-account_ program as described in the "Setup" section, or see `./setup/mongodb-account --help`.
