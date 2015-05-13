
var Defer = require('q');

var ObjectId = require('mongodb').ObjectID;
var escapeMongoKey = require('./mongoutils').escapeKey;

module.exports.Put = IndexMongodbLinkMenuItem;
module.exports.Delete = IndexMongodbLinkMenuItemDel;

function IndexMongodbLinkMenuItem(db, transform, resources, render, document, schema){
	var operations = [];
	var ret = Defer.defer();
	// For every List that 'resource' will appear in:
	// 1. Update resource._cache[viewName] with sorting and computed data
	var itemdb = resources["db-mongodb-linkmenuitem"];
	if(!itemdb) return;
	var src_ts = new ObjectId;
	// FIXME parse `document` against `schema` and look for sub-instances of type <http://magnode.org/LinkMenuItem>
	// then index them at `itemdb`
	// For now we just look for the "menu" property
	var menuitems;
	if(typeof document.menu=='object' && !Array.isArray(document.menu)){ // not an Array
		menuitems = Object.keys(document.menu).map(function(v){
			document.menu[v].parent = v;
			return document.menu[v];
		});
	}else if(typeof document.menuitems=='object' && Array.isArray(document.menuitems)){ // is an Array
		menuitems = document.menuitems;
	}else{
		return;
	}
	var operations = menuitems.map(function(def){
		if(def.parent) top=def.parent;
		var where = {
			_src: document._id,
			top: top,
		};
		// FIXME read 'self' link relation
		var item = {
			_rev: src_ts, // identifier/timestamp to detect old/stale data
			_src: document._id, // pointer to the authortative source
			top: top,
			ref: document._id,
			label: def.label||document.label,
			href: def.href||document.subject||document.id,
		};
		return {
			update: item,
			where: where,
		};
	});
	iterateOperation(0);
	function iterateOperation(i){
		var op = operations[i];
		if(!op) return void done();
		itemdb.update(op.where, op.update, {upsert:true}, function(err, doc){
			if(err) throw err;
			iterateOperation(i+1);
		});
	}
	function done(){
		var where = {
			_src: document._id,
			_rev: {$lt: src_ts},
		};
		itemdb.remove(where, {multi:true}, function(){
			ret.resolve();
		});
	}
	return ret.promise;
};

function IndexMongodbLinkMenuItemDel(db, transform, resources, selector){
	var operations = [];
	var ret = Defer.defer();
	var itemdb = resources["db-mongodb-linkmenuitem"];
	if(!itemdb) return;
	var src_ref = selector._id;
	if(!src_ref) return;
	var where = {
		_src: src_ref,
	};
	itemdb.remove(where, {multi:true}, function(){
		ret.resolve();
	});
	return ret.promise;
};

/*
Each update event will need the following info:
* MongoDB database connection
* Resource that was updated
* Copy of new data
* Handling for incremental updates
*/
