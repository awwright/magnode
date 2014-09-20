
var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports = IndexMongodbLinkMenuItem;

function IndexMongodbLinkMenuItem(db, transform, resources, render, document, schema){
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var itemdb = resources["db-mongodb-linkmenuitem"];
	if(!itemdb) return void done();
	if(!document.menu) return void done();
	var operations = [];
	// FIXME parse `document` against `schema` and look for sub-instances of type <http://magnode.org/LinkMenuItem>
	// then copy them to `itemdb`
	// For now we just look for the "menu" property
	for(var top in document.menu){
		var def = document.menu[top];
		var where = {top:top, ref:document._id};
		// FIXME read 'self' link relation
		var item = {top:top, ref:document._id, label:def.label||document.label, href:def.href||document.subject||document.id};
		operations.push({update:item, where:where});
	}
	iterateOperation(0);
	function iterateOperation(i){
		var op = operations[i];
		if(!op) return void done();
		itemdb.update(op.where, op.update, {upsert:true}, function(err, doc){
			if(err) throw err;
			iterateOperation(i+1);
		});
		function end(){
			collection.update({_id:document._id}, {$set: cacheValue}, function(err){
				if(err) throw err;
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
