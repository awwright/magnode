
var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports = IndexMongodbList;

function IndexMongodbList(db, transform, resources, operations){
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var listdb = resources["db-mongodb"].collection('list');
	iterateOperation(0);
	function iterateOperation(i){
		var op = operations[i];
		if(!op) return void done();
		var document = op.insert || op.update;
		var collectionName = op.collection.collectionName || op.collection;
		// Get a reference to the collection so we can modify the newly inserted/updated item
		var collection = resources["db-mongodb"].collection(collectionName);
		var cacheValue = {};
		listdb.find({collection: collectionName}).each(function(err, doc){
			if(err) throw err;
			if(!doc) return void end();
			var listName = doc.id;
			cacheValue['_cache.' + escapeMongoKey(listName)] = listName;
		});
		function end(){
			collection.update({_id:document._id}, {$set: cacheValue}, function(err){
				if(err) throw err;
				iterateOperation(i+1);
			});
		}
	}
	function done(){
	}
};

/*
Each update event will need the following info:
* MongoDB database connection
* Resource that was updated
* Copy of new data
* Handling for incremental updates

*/
