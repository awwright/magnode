/*
You can also subtype this transform's output for the benefit of Cursor -> HTML transforms further down the line
e.g. Transform:MongoCursor<Type>_typeMongoDB_List
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.Auto_typeMongoDB_List" ;
	view:domain type:MongoDB_List<Type> ;
	view:range type:MongoCursor<Type> .
Where: MongoCursor<Type> rdfs:subClassOf type:MongoCursor;
*/
var util=require('util');
var url=require('url');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var node = input.node;
	var subject = node.subject;

	var action = url.parse(input.request.url, true);
	if(!node.subject) node.subject=node.resource;

	input['db-mongodb-schema'].findOne({subject:subject}, function(err, schema){
		if(err) throw err;

		var properties = schema&&schema.schema&&schema.schema.properties || {};
		var fields = {};
		for(var n in properties) fields[n]=1;

		// Get the filter/query
		// TODO: unescape $ characters
		var filter = schema.query&&schema.query.filter || {type:subject};
		var query = input['db-mongodb'].find(filter, fields);
		query.pager = {};

		// Add a limit and offset, but only if we're told to
		query.pager.limit = action.query.limit&&parseInt(action.query.limit) || schema.query&&schema.query.limit || 20;
		if(action.query.offset){
			query.pager.offset = parseInt(action.query.offset);
			query.pager.page = Math.floor(parseInt(action.query.offset)/query.pager.limit);
		}else if(action.query.page){
			query.pager.page = parseInt(action.query.page);
			query.pager.offset = Math.floor(query.pager.page*query.pager.limit);
		}else{
			query.pager.page = 0;
			query.pager.offset = 0;
		}
		if(query.pager.offset) query.skip(query.pager.offset);
		query.limit(query.pager.limit);

		if(schema.query&&schema.query.sort){
			var sortOrder = {};
			var keys = (schema.query.sort instanceof Array)?schema.query.sort:[schema.query.sort];
			keys.forEach(function(k){
				// New keys are usually appended to the ordering of the keys
				// Depending on this is a major and very poor hack on the part of MongoDB
				if(typeof k=='string') sortOrder[k]=1;
				else if(typeof k.key=='string') sortOrder[k.key]=(k.dir||1);
				else throw new Error('Invalid sort order');
			});
			query.sort(sortOrder);
		}

		var output = {};
		for(var j=0;j<outputTypes.length;j++){
			output[outputTypes[j]] = query;
		}

		callback(output);
	});
}
module.exports.URI = 'http://magnode.org/transform/MongoCursor_typeMongoDB_List';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoDB_List']}
	, 'view:range': 'type:MongoCursor'
	};
