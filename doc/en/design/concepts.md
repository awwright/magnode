## Concepts

The Web is founded on a number of design concepts or axioms of design. They are summarized and detailed across a number of documents.


### The Web architecture

We talk about the Web as a single application comprised of many services, in a similar way that E-mail or BitTorrent is distributed with no central node.

The Web was started as a distributed hypertext platform, where you could author documents, and link to other people's documents. After much experimentation, it soon became clear that the Web was good for much more than authoring academic papers, and people have begun implementing entire interactive programs within Web browsers. Can these embedded applications be compatible with the goal of the Web, a distributed platform to share and disseminate data?

The Web is implemented at the top layer in a number of layers that implement the Internet. The physical layer defines how to broadcast radio signals or toggle electrical signals to transmit bits. The data-link layer defines how to move small packets between two connected devices. The network layer defines how to forward packets inside a network. The transport layer defines how to create streams of data from packets. The Web sits at the application layer and defines how to query and manipulate the state of resources using any stream (typically TCP, which itself may go across Wi-Fi, IPv6, fiber, ethernet, power lines, ...). The Web is, essentially, a giant distributed key-value database that can store anything from scientific papers to the state of your light switch.

However, we began seeing that the possible uses of the Web was outgrowing its design, so we began to formally take a close look at that design.

The formal definition of the Web was started in 2000 by the principal author of the HTTP/1.1 specification, Roy T. Fielding, in his doctoral dissertation "Architectural Styles and the Design of Network-based Software Architectures". When designing most applications, we start out with a blank slate and add on features until we have the functionality we desire. This is not how the Web was designed.

Because this is a single application that everyone will be using and developing for, the Web had to cover all possible use cases. So when formally defining the Web, we instead started out with the set of all possible networked applications. We call this the null set because there are no constraints. But of course this is too easy, if anyone is allowed to do anything, we have no clue what to expect, and the application is useless. So we begin to add constraints to the application. Every constraint that we add to the application is going to isolate complexity of the underlying system, and expose functionality by bringing all users of the system to a common understanding.

To start identifying constraints, we note that there's still some concepts that are fundamental to any program: data, the stuff that gets passed around; components, stuff that processes data; and connectors, which defines which outputs flows to which inputs. Many of these constraints build on each other, and by applying multiple constraints we can form an application architecture.

Even in the null set, there's still some fundamental components to any program - data, the stuff that gets passed around; components, stuff that processes data; and connectors, which defines what output flows to which input.

We use these primitives to define our first constraint, that the application must be client-server (CS). This separates the data storage concerns from our user interface concerns: All the data in the application is stored on a server, and all interaction with the data happens through a client.

In order to promote scalability, we specify that each request must contain all the information necessary to process the request. This is the stateless constraint to form client-stateless-server (CSS). This means that the server only needs to scale with the number of requests, and not necessarily the total number of connections, users, or systems on the network. This constraint is added to Client-Server to form Client-Stateless-Server. Notice however, that the application might have large costs to transferring data from a central server to a client, things like latency or even a monetary cost. So we add a few more constraints.

We add the cache constraint ($), which is a constraint itself derived from the Replicated Repository constraint, which allows a client to make intelligent decisions on when to re-request a resource. For instance, a server might say "This request will never change, cache it indefinitely", and a client will be able to ask a server if a resource has changed. We combine the Cache constraint with Client-Stateless-Server to create the Client-Cached-Stateless-Server (C$SS) design.

(A constraint whereby clients deal with resources, "Addressing" or "Resources", might also be a constraint, but it's not explicitly defined here as a constraint. If this is built-into the Stateless constraint or the Replicated Repository constraint, I leave as an exercise to the reader.)

Does the Uniform constraint require any other constraints, like client-server?

Up until about 1997, this is how the Web was designed. This style, Client-cached-stateless-server, or "C$SS", formed the only constraints on the design of the Web. But as HTTP was being written, and more technologies were finding themselves into Web browsers, we had to make sure that the technologies would be future-proof. So we added a few more constraints.

Fourth, we define that the application must be layered - so we can have intermediate gateway servers or proxies process the request. With the layered constraint, now we can have caching servers in between a client and the origin server that process requests on behalf of the origin server, using nothing more than the caching information.

Fifth, we have code-on-demand, which means that if a user-agent doesn't understand the data in a response, the response can attach a stylesheet or script that can be executed. This constraint is significant because it's responsible for the design of CSS (Cascading Stylesheets), which separates data from presentation. COD is a so-called "optional constraint" - neither the client nor server needs to implement it if not needed, but your media type must be capable of supporting it. COD is a combination of the Client-Server constraint, and the Virtual Machine constraint.

The final and most important constraint in the design of the Web is called the uniform interface. Imagine the uniform interface like the stateless constraint, but backwards: It means that the server must be self-descriptive and respond with all the information necessary for a client to process a response. This is accomplished in four ways:

* identification of resources;

* manipulation of resources through representations;

* self-descriptive messages;

* and, hypermedia as the engine of application state.

Together, these constraints are called LCODC$SSU... Or more commonly, Representational State Transfer or REST.

Note that there's a number of constraints that were identified, but are not required in REST, or are specifically excluded:

* Pipe and Filter
* Uniform Pipe and Filter
* Remote Session
* Remote Data Access
* Remote Evaluation
* Event-based Integration
* C2
* Distributed Objects
* Brokered Distributed Objects

### The Uniform Constraint

Even though the Uniform constraint is most important aspect of the Web, it hasn't gotten very much attention because Roy didn't really expand upon it in his dissertation very much.


### Other Resources

* <http://www.w3.org/DesignIssues/Principles.html>
* <http://www.w3.org/TR/cooluris/>
* <http://www.w3.org/DesignIssues/Fractal.html>
* <http://www.w3.org/DesignIssues/TermResource.html>
* <http://www.w3.org/TR/chips/>
* <http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm>
* <http://www.w3.org/TR/webarch/>
