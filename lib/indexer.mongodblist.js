// Whenever a resource changes, update all computed values used by lists (as stored in the 'list' collection)

var Defer = require('q');

var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports = IndexMongodbList;

function IndexMongodbList(db, transform, resources, render, document, schema){
	var ret = Defer.defer();
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var listdb = resources["db-mongodb"].collection('list');
	var collectionName = schema.collection;
	// Get a reference to the collection so we can modify the newly inserted/updated item
	var collection = resources["db-mongodb"].collection(collectionName);
	var cacheValue = {};
	listdb.find({collection: collectionName}).each(function(err, doc){
		if(err) throw err;
		if(!doc) return void end();
		var listName = doc.id;
		if(!listName) return;
		// TODO this needs to actually compute the values in question
		cacheValue[listName] = listName;
	});
	function end(){
		ret.resolve({type:'CacheItem', key:'list', value:cacheValue});
	}
	return ret.promise;
};

/*
Each update event will need the following info:
* MongoDB database connection
* Resource that was updated
* Copy of new data
* Handling for incremental updates

*/
