## Access Control

* Reiterate the purpose of URIs, for identifying resources
* Another token may be used to demonstrate access to a resource (a “bearer token”)
* Overview common authentication strategies
* Discuss tiers of authentication methods - sessions mustn’t be used to change passwords, assessing risk when authorizing access

### Primitive Access Control

The most common form of access control is that employed by software programs on the instruction level, the pointer-ownership model, where a pointer to a resource implies full control (known as ownership) over it. For instance, an object in memory. Typically when multiple owners of a resource exist, it’s because they will share the resource in a predictable, pre-designed way that works for all the owners.

### The User Agent

As discussed previously, a RESTful application server allows the embedding of a script that the user agent may execute if it so chooses (which is every time for generic user agents like Web browsers). The possibility that arbitrary scripts may be executed brings with it numerous security considerations, especially privacy concerns if the script can autonomously communicate back “home” (as with modern Web content).

Particularly we want to make sure that third party scripts don’t gain access to confidential information or make malicious requests that the user doesn’t want.

When designing access control systems for the Web, it is important to remember that it is not the user making a request, but their user agent. The user agent makes requests that the user asks for, but will also make requests that they didn’t specifically authorize - like downloading images. These images haven’t been requested by the user, but by the website that embedded them. Therefore, because it’s not the user’s request,  user-agent shouldn’t send user authentication information automatically. In practice, user agents will send credentials almost all the time. Additionally, there are other malicious requests that could be made. For instance, a website could create a form that makes a POST request to a bank - because the user made the submission and the response will be handled by the viewing window, it makes sense to send the user’s credentials along with the request, even though in this case it is fraudulent.

This class of attacks are called Cross-Site Request Forgeries, and are traditionally mitigated using a “CSRF Token”, an unguessable token that is issued by the website alongside the form, and grants permission to submit the form. These have been implemented in a variety of ways, using cookies or Message Authentication Codes.

### Resource vs. User Requests

It is important to note a distinction between the user agent making the request, and a resource making a request. If a request has been made by the user, it is to be rendered by the user agent display, and should include the user’s authentication credentials. If the request is due to an embedded script, the request should not intrinsically know about the user’s credentials, and be requested only with the specified parameters, which may include custom-provided credentials. (However, this principle is violated by simple, same-origin XMLHttpRequest requests, and will include the user’s Cookie and Authorization headers. If the request is to the same origin, the response will also be readable. Beware.)

As part of the security model, resources cannot typically see the resource they have requested, unless the downloaded resource is from the same origin, or it specifically grants permission to be accessible.

### The Bearer Security Model

The Bearer security model is one whereby a token is issued that grants its bearer access to resources (hence the name). A bearer token has an associated set of permissions that it grants, and optionally a timestamp and expires date, and an associated user, parent token, or chain of command (for auditing purposes). This information should be stored in a key-value database, where the key is the 128-bit randomly generated token, but it might also be stored in the token itself, if the token is cryptographically signed by the server using a MAC (however in this case, the token is hard to revoke).

To demonstrate the difference from the pointer security model, consider Alice, visiting a kitten pictures website, and one of the requests is in fact a POST request to her banking website: <https://bank.example.com/?from=Alice;to=Eve;amount=100>

Under the pointer security model, simply guessing this URI would initiate a transfer into Eve’s account. This is how many real-life security systems work in practice, for instance checking account numbers, if also provided with the bank’s routing number. In many situations this is sufficient, there’s not often a need to talk about a particular account unless you’re talking about managing it in some fashion.

However in the Web especially, we need to talk _about_ resources even though we don’t necessarily have _authority_ over them. This is in the definition of the URI, it is strictly an identifier, it must not grant access _per se_. An additional token is required to do that. It is more akin to a safe deposit box: You have a box number, and a separate key to open the box (which might not even be printed with the box number).

The Bearer security model has existed in various forms, particularly in the form of the CSRF token. When protecting against CSRF attacks, we want to avoid the route that many systems take where there is entirely dedicated logic to handle specifically form submissions, because more and potentially redundant code is harder to test and more prone to breakage.

Using the bearer security model for form submissions means the form token should be the only authentication token in the request. The session cookie, if any, is ignored here. So, the form token should be a grant of permission to make changes to the server state, and ideally no more permissions than necessary. No other token should grant this permission: Session cookies must never be permitted to change the server state.

Because such a bearer token will only be generated by the server, and because the token sits within the sandbox of the user requesting the form, only a user-agent who can read a request and submit it with read/write credentials can submit requests on behalf of the user. This includes same-origin XMLHttpRequest queries, additional considerations may be necessary if these are to be prevented.

### Same Origin Policy: The Legacy Web Security Model

@@@TODO reorganize content about same-origin here and re-describe where it introduces security holes… and there’s lots of them

### The Unix Security Model and Setuid

@@@TODO Unix provides an interesting analogy to Web access control, and especially the setuid bit, where server-run scripts are like “setuid root” and client-run scripts are “userspace”. It’s not a complete analogy - a resource on the Web runs as its own separate user, it doesn’t inherit the permissions of the user unless specifically given a credential.

### Authentication vs. Authorization

There’s a difference… right? Or is there? Talk about risk management and weighing authorization based on the method of authentication used. Note that permissions can be sandboxed and delegated to other authorities, particularly note that a session token in a cookie is a delegation to the user-agent, not the user himself.

### Overview of Access Control Technologies

#### Authorization header

The Authorization header is used for access control stuff.

#### OAuth

If properly secured, third parties will not be able to make requests to an application by default. However, for a networked application, it is often a desirable feature for multiple applications to make requests of each other, for instance, to let Twitter post to one’s Facebook profile. In order to do this, the third party application must make the request with the user credentials that have been specifically passed to it.

OAuth is a process for performing an exchange of credentials to let third party applications act on behalf of a user.

OAuth tends to be very misunderstood (even by its own creators), and is often inappropriately used, resulting in lots of hate and anger. Don’t give into the Dark Side, use OAuth for Good.


### Authorizing reads on a resource

We have to deal with the fact that we're operating on an open world basis. We don't know all datatypes that we are dealing with for the resource.


### Authorizing writes on a resource

Unlike reads, where only one party needs to consent, writes require the consent of all items that the uploaded resource will be touching.

If the uploaded resource is going to be replacing another, it needs the permission of that resource.

Additionally, the permission of the collection that the resource will be a member of is required. If that collection is a member of a collection, the process is repeated recursively. Finally when the collection is a member of the authority, the authority must grant permission to accept the write.

This suggests that by default, collections should be configured to deny read permission and allow write permission. This may seem permissive, however note that the authority and individual resources (the server itself) will by default allow read permission and deny write permission unless there is a particular rule saying otherwise. For instance, the main authority may be configured with "allow anyone to submit a comment", and the comments themselves are configured to never allow writes, thus making the database append-only.

This design is to avoid violation of the open-world assumption; if the server forgot that a resource is a member of a collection or an instance of a class (which is allowed in OWA), it wouldn't matter, since the resource's membership in the collection was never necessary to prevent writing nor reading.


### Publishing/unpublishing resources

Resources can exist on the server in an "unpublished" state - they're in the database, but no one (ignoring superusers) can access them. The authorization to allow a class of people to see the resource is said to _publish_ the resource.

Publishing a resource isn't always an on-or-off state. Resources can be published in numerous fashions: Published privately to a registered users, published publically, or published within a specific time period.

Resources are also published _to_ particular locations. A resource may be published (visible) on the front page of a particular website. In this case especially, it is necessary to differentiate _which_ website frontpage it is to be placed on (especially if the database stores multiple websites that may share content).
