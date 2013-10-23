## Permissions

Permissions are the class of technologies that include authorization and authentication. _Authentication_ is the act of verifying the identity of a party. _Authorization_ is allowing a party to perform a particular action.

Authentication and authorization are not completely seperate concepts. For security reasons, it is necessary that user agent stored credentials like a Cookie are not used to modify the state of a server, otherwise the server is susceptable to a confused deputy attack (although user agents won't make the responses to cross-orign requests readable, they will still be executed if not otherwise marked read-only).

There are also economic and risk factors to consider. It is often easier to gain access to a session token than a user password, in the case of the session token, a user merely need leave their laptop open in an Internet cafe. It is a good idea that a user cannot change their credentials without offering personally identifying credentials.

That is, the question is not merely "Can Alice change her password?" but, "Can Alice, when identified by a session token, change her password?" The respective answers are "Yes, but not necessarially" and "No."

In order to satisfy this requirement, it is important to acknowledge that it is not the user acting in person, but a user agent that is acting. It is the user agent that bears the credentials on behalf of the user. When a user logs into a website with their password, they have delegated the user agent to act on their behalf and perform actions for them - typically actions that they explicitly prompt the user agent for.


### Authentication

Authentication checks a particular request and determines (1) the user the request is associated with, and (2) the sandbox of permissions that the user has.

### Testing authorization

### Authorizing reads on a resource

We have to deal with the fact that we're operating on an open world basis. We don't know all datatypes that we are dealing with for the resource.


### Authorizing writes on a resource

We want to make sure every type that the resource is an instance of approves of the change to the resource. This is called the ack check (acknowledge write).

However, this violates the open world assumption - if we don't know a resource is of a particular type, how can we ask that type for permission?

However, we do mostly know what datatypes are stored in the database, so we can at least ping those for their ack.

We also perform the standard one-grant-needed check, where at least one of the types must authorize being written to. This type is the _home_ type, and is the one to offer a space.


### Publishing/unpublishing resources

Resources can exist on the server in an "unpublished" state - they're in the database, but no one (ignoring superusers) can access them. The authorization to allow a class of people to see the resource is said to _publish_ the resource.

Publishing a resource isn't always an on-or-off state. Resources can be published in numerous fashions: Published privately to a registered users, published publically, or published within a specific time period.

Resources are also published _to_ particular locations. A resource may be published (visible) on the front page of a particular website. In this case especially, it is necessary to differentiate _which_ website frontpage it is to be placed on (especially if the database stores multiple websites that may share content).
