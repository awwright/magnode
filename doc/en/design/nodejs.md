## Node.js
As described in [About: Origins](#about.origins), the goal from the beginning was to produce a high-performance core that used Javascript to code events. Upon hearing about Node.js, it was immediately clear that it was the perfect choice of platform, the motto of Node.js being "Evented I/O".

### Design
Node.js follows a _fully evented_ model. This offers the ability to have high concurrency, for instance, to stream events to the web browser.

### Callbacks
Callbacks are to be called exactly once.

### Events
Events are where functions can be registered to be called, for the triggering of an event. Events may be called any number of times.
