/*
Transform:MongoCursor_typeMongoDB_List
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.Auto_typeMongoDB_List" ;
	view:domain type:MongoDB_List ;
	view:range type:MongoCursor .
*/
/*
e.g. Transform:MongoCursor<Type>_typeMongoDB_List
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.Auto_typeMongoDB_List" ;
	view:domain type:MongoDB_List<Type> ;
	view:range type:MongoCursor<Type> .
Where: MongoCursor<Type> rdfs:subClassOf type:MongoCursor;
*/
var util=require('util');
var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var inputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var outputTypes = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
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
		console.log(filter);
		var query = input['db-mongodb'].find(filter, fields);

		// Add a limit and offset, but only if we're told to
		var limit = action.query.limit&&parseInt(action.query.limit) || schema.query.limit || 20;
		if(action.query.offset){
			query.skip(parseInt(action.query.offset));
			query.limit(limit);
		}else if(action.query.page){
			query.skip(parseInt(action.query.page)*limit);
			query.limit(limit);
		}else if(action.query.limit){
			query.limit(limit);
		}

		var output = {};
		for(var j=0;j<outputTypes.length;j++){
			output[outputTypes[j]] = query;
		}

		callback(output);
	});
}
