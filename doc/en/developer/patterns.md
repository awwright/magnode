## Common Coding Patterns

Often there's many patterns found in code for doing common tasks. Normally we try to de-duplicate behavior into nice compact function calls.

However many of these patterns don't belong in functions, because their behavior cannot be replicated by a function. The best we can do is document the proper way to utilize the pattern and describe what it does.


### return void

Asynchronous result callbacks, by definition, are supposed to be called exactly once, so it's often useful to call `return` immediately after they are called.
It would be nice to combine these two statements into a single statement, however, we don't want to use `return callback()` because the presence of a return value may imply that it has meaning, when it in fact has none.

The solution is to use:

	return void callback();

This executes the callback, then returns `undefined`. This pattern should be used even when the function is known to always return undefined, because the presence of the `void` keyword shows developers that the return-value of the function is _supposed_ to be insignificant.
For instance:

	return void process.nextTick(callback);

Even though it is known that process.nextTick always returns `undefined`.


### Sequential asynchronous iteration

Use of simple abstraction libraries should be avoided, since their exact behavior is not immediately appearent to developers and it adds complexity to the code.

Here is the known-correct way of iterating an array, passing each value to an asynchronous function, and evaluating the next item when there is a return value:

	var itemList = [0, 1, 2, 3, "..."];
	var sum = 0;
	iterateItems(0);
	function iterateItems(i){
		var item = itemList[i];
		if(item===undefined) return void done();
		database.get(item, function(err, value){
			if(err) return void done(err);
			sum += value;
			iterateItems(i+1);
		});
	}
	function done(){
		/* ... */
	}
