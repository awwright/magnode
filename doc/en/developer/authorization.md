## Authorization

Authorization is the act of determining if an entity like a user has permission to perform an action on a resource. In Magnode, a number of drivers may grant permission to an action whenever they are requested. If no driver grants access, the action is denied.

The authorization checker is a function passed with other resources when the transform process is applied. Transforms are supposed to call the authorization function whereever they act on an object that's not part of the request-specific memory, like making a request from the database, or writing to the network.

Transforms must assume failure if an authorization resource is not provided. If necessary, a function that always returns true may be passed as an authorization resource. Obviously, this is not encouraged.

Authorization calls are made to a function `function(user, actions, resources, callback)` with the following arguments:

 * user: The authenticated user resource. Can be the same as `resources` or a specify a different user to test their permissions.
 * actions: A string URI or an Array of actions or transform types that the `user` must be able to execute on the `resources`. _All_ of the actions _must_ be allowed on _all_ of the resources. Generally, each seperate appearence of a `test` call should use a different "action" string.
 * resources: Resources being used in the authorization request. This may simply be the resources map as provided to a transform function, and normally contains the user authenticated resource (though this is read from the _user_ argument).
 * callback: A `function(authorized)` called with `true` or `false` depending on the outcome. Error conditions always cause a `false` return, and additionally for security, you cannot see the error or why (see authorization auditing for more information). You _must_ test this value with strict equality (e.g. `if(authorized===true){ /* ... */ }else{ /* ... */ }`).

### Authorization auditing

Here we want to see which rule allowed the action. For security reasons, we do not want to tell users why their action was denied, but only that it was. Giving users more information gives malicious attackers more information to perform an attack with.
