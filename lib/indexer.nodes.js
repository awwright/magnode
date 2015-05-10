// This is (probably) supposed to index the rel=self links of resources and redirect to them

var Defer = require('q');

var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports = IndexMongodbLinkMenuItem;

function IndexMongodbLinkMenuItem(fndb, transform, resources, render, document, schema, links){
	var ret = Defer.defer();
	console.log('Update nodes', links);
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var db = resources["db-mongodb-nodes"];
	if(!db) return;
	var subject = links.filter(function(v){ return v.rel=='self'; }).map(function(v){return v.href})[0];
	var type = links.filter(function(v){ return v.rel=='type'; }).map(function(v){return v.href});
	var where = {
		targetCollection:schema.put.storeResource,
		targetId: document._id,
	};
	var update = {
			subject: subject,
			type: type,
			links: links,
			label: document.label,
			targetCollection: where.targetCollection,
			targetId: where.targetId,
			_index: 'nodes'
	};
	console.log('Update nodes result:', update);
	db.update(where, update, {upsert:true}, function(err, doc){
		if(err) throw err;
		ret.resolve();
	});
	return ret.promise;
};
