// This is (probably) supposed to index the rel=self links of resources and redirect to them

var Defer = require('q');

var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports = IndexMongodbLinkMenuItem;

function ianans(s){ return 'http://www.iana.org/assignments/relation/'+s; }

function IndexMongodbLinkMenuItem(fndb, transform, resources, render, document, schema, links){
	var ret = Defer.defer();
	//console.log('Update nodes', links);
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var db = resources["db-mongodb-nodes"];
	if(!db) return;
	var subject = links.filter(function(v){ return v.predicate==ianans('self'); }).map(function(v){return v.object.toString()})[0];
	var type = links.filter(function(v){ return v.predicate==ianans('type'); }).map(function(v){return v.object.toString()});
	var where = {
		targetCollection: schema.collection,
		targetId: document._id,
	};
	var update = {
			subject: subject,
			type: type,
			links: links.map(function(v){ return {subject:v.subject.toString(), predicate:v.predicate.toString(), object:v.object.toString()}; }),
			label: document.label,
			targetCollection: where.targetCollection,
			targetId: where.targetId,
			_index: 'nodes'
	};
	//console.log('Update nodes result:', update);
	db.updateOne(where, update, {upsert:true}, function(err){
		if(err) throw err;
		ret.resolve();
	});
	return ret.promise;
};
