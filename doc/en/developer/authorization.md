## Authorization
Authorization is a resource passed with other resources when the transform process is applied. Transforms are supposed to call the authorization function where appropriate to determine if the user is authorized to perform the action requested. Authorization may also be checked before the transform process when the list of resources to be transformed is being generated.

Transforms must assume failure if an authorization resource is not provided. If necessary, a function that always returns true may be passed as an authorization resource. Obviously, this is not encouraged.

Authorization calls are made to a function `function(user, actions, resources, callback)` with the following arguments:

 * user: The authenticated user resource. Can be the same as `resources` or a specify a different user to test their permissions.
 * actions: A string URI or an Array of actions or transform types that the `user` must be able to execute on the `resources`. _All_ of the actions _must_ be allowed on _All_ of the resources.
 * resources: Resources being used in the authorization request. This may simply be the , and normally contains the user authenticated resource (though this is ignored).
 * callback: A `function(authorized)` called with `true` or `false` depending on the outcome. Error conditions always cause a `false` return, and additionally for security, you cannot see the error or why. (See authorization auditing for more information.)

### Authorization auditing
Here we want to see which rule allowed the action. For security reasons, we do not want to tell users why their action was denied, but only that it was. Giving users more information gives malicious attackers more information to perform an attack with.
