## RDFa Templates

RDFa Templates is a formally described specification developed for Magnode:

* [RDFa Templates](http://magnode.org/rdfa-templates/)

Here's a description of how the theory of it works and to get started.

Start with the query representing the global control structure, this catches everything not inside a control block. Recurse into the nodes.

When a for-each control handler is encountered, it needs to create a new query that has more patterns than the parent control handler.

### Query Generator Example 1

	Global:A
		Triple1
		Triple2
		for-each:B
			Triple3
			optional
				Triple4
				for-each:C
					Triple5
			for-each:D
				Triple6

Queries:

	A: 1 2
	B: 1 2 3 OPTIONAL{4}
	C: 1 2 3 OPTIONAL{4} 5
	D: 1 2 3 OPTIONAL{4} 6

### Query Generator Steps
Recurse through blocks.

When a triple is encountered, add it to the scope's query.

When a for-each is encountered, make note of it, but don't recurse just yet (there might be more triples).

When all the triples for that block have been encountered (except for those the for-each blocks that are skipped), add that as a query.

Now we decend into the for-each blocks, passing the scope's query to them.

### Additional functionality

Turtle can be embedded in a script block, which will also be parsed for triples to provide additional information about classes. See the [Turtle spec](http://www.w3.org/TR/turtle/) and [N3 in HTML](http://www.w3.org/wiki/N3inHTML).
