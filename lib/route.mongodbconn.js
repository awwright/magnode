var rdf=require('rdf');
var ObjectId=require('mongolian').ObjectId;
var escapeHTML=require('./htmlutils').escapeHTML;

// Route the following paths, relative to some base e.g. <http://example.com/mongodb/>
// * <collection/$collection?index> - List indexes
// * <index/$collection/$index> - an index
// * <collection/$collection/ObjectId/$_id> - document
// * <collection/$collection/String/$_id> - document
// * <collection/$collection/Number/$_id> - document
// * <collection/$collection/Date/$_id> - document
// * <collection/$collection/Hex/$_id> - document

module.exports = function registerHandler(route, resources, renders, prefix, db){
	function routeResource(resource, callback){
		if(resource.indexOf(prefix)!==0) return void callback();
		var path = resource.substring(prefix.length).split('?',1)[0];
		var hier = path.split('/');
		var querystring = path.substring(path.length+1);
		if(hier[0]===''){
			var result = {'http://magnode.org/MongoDBDatabase': {db:db}};
			callback(null, result);
		}else if(hier[0]=='index'){
			var indexName = hier[1];
		}else if(hier[0]=='collection'){
			var collectionName = hier[1];
			var keyType = hier[2];
			var keyString = hier[3];
			if(keyType===undefined){
				// Return the collection
				db.collection(collectionName).indexes(function(err, indexes){
					if(!indexes || !indexes.length) return void callback();
					var result = {'http://magnode.org/MongoDBCollection': {db:db, collection:collectionName}};
					result['http://magnode.org/HTMLBodyBlock_ResourceMenu'] = [];
					callback(null, result);
				});
				return;
			}
			// Return a document
			var keyValue;
			switch(keyType){
				case 'ObjectId': try{ keyValue=new ObjectId(keyString); }catch(e){} break;
				case 'String': keyValue=keyString; break;
				case 'Number': keyValue=parseFloat(keyString); break;
				case 'Date': keyValue=new Date(keyString); break;
				default: return void callback();
			}
			if(keyValue===undefined) return void callback();
			var query = {_id: keyValue};
			db.collection(collectionName).findOne(query, function(err, document){
				if(err || !document) return void callback(err);
				var result = {'http://magnode.org/MongoDBDocument': document};
				callback(null, result);
			});
		}


	}
	route.push(routeResource);
}
