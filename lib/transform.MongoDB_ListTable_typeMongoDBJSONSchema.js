/*
These statements are automatically created by ./transform.MongoDBJSONSchemaTransform.js
*/
var util=require('util');
var url=require('url');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});

	var node = input.node;
	var subject = node.subject;

	var action = url.parse(input.request.url, true);
	if(!node.subject) node.subject=node.resource;

	input['db-mongodb-schema'].findOne({subject:subject}, function(err, schema){
		if(err) return void callback(err);
		if(!schema) schema={};

		// Get the list of columns we want to print
		var fields = [{name:'_id',type:'ObjectId'}];
		var properties = {};

		if(schema.tablequery&&(schema.tablequery.fields instanceof Array)){
			fields = schema.tablequery.fields;
		}else if(schema.schema&&schema.schema.properties){
			fields = Object.keys(schema.schema.properties);
		}

		var doc =
			{ label: node.label
			, query:
				{ filter: {subject:{$exists:true}, type:subject}
				, fields:
					fields.map(function(k){
						if(typeof k=='string'){
							var o = schema.schema.properties[k];
							if(o) o.name = o.name || k;
							return o;
						}
						return k;
					})
				}
			, subject: subject
			, type:
				[ 'http://magnode.org/MongoDB_List'
				, 'http://magnode.org/MongoDB_ListTable'
				]
			};

		callback(null, {'http://magnode.org/MongoDB_List':doc, 'http://magnode.org/MongoDB_ListTable':doc});

	});
}
module.exports.URI = 'http://magnode.org/transform/MongoDB_ListTable_typeMongoDBJSONSchema';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoDBJSONSchema']}
	, 'view:range': ['type:MongoDB_ListTable', 'type:MongoDB_List']
	};
