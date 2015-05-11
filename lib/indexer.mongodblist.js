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
	var subqueries = [];
	var cacheValue = {};
	listdb.find({collection: collectionName}).each(function(err, doc){
		if(err) throw err;
		if(!doc) return void iterateSubqueries(0);
		var listName = doc.id || doc._id.toString();
		if(!listName) return;
		var fields = doc.fields || [];
		fields.forEach(function(f){
			var d = f.dereferenceField;
			if(!d) return;
			subqueries.push({
				info: d,
				field: f,
				key: d.localProperty+' '+d.foreignCollection+' '+d.remoteProperty,
			});
		});
	});
	function iterateSubqueries(i){
		var q = subqueries[i];
		if(!q) return void end();
		var collection = resources["db-mongodb"].collection(q.info.foreignCollection);
		var where = {};
		where[q.info.remoteProperty] = document[q.info.localProperty];
		collection.findOne(where, function(err, doc){
			if(!doc) doc = {};
			var value = doc;
			if(q.info.select){
				value = {};
				var select = (Array.isArray(q.info.select) ? q.info.select : [q.info.select]);
				select.forEach(function(f){ value[f] = doc[f]; });
			}
			cacheValue[q.key] = value;
			iterateSubqueries(i+1);
		});
	}
	function end(){
		ret.resolve({type:'CacheItem', name:'list', value:cacheValue});
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
