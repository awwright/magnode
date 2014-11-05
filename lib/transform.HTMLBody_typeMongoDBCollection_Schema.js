var util=require("util");

var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var escapeHTML=require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var doc = input["http://magnode.org/MongoDBCollection_Schema"];
	var collection = doc.db.collection(doc.collectionName);

	var body = '<h1>MongoDB Collection <i>'+escapeHTML(doc.collectionName)+'</i></h1>';

	var schema = {type:'object'};

	function updateSchema(schema, instance){
		//schema.example = instance;
		if(!schema.examples) schema.examples = 0;
		schema.examples++;

		if(!schema.type) schema.type=[];
		var instanceType;
		switch(typeof instance){
			case 'object':
				if(!instance) instanceType='null';
				else if(typeof instance.getDate=='function') instanceType='Date';
				else if(typeof instance.toHexString=='function') instanceType='ObjectId';
				else if(Array.isArray(instance)) instanceType='array';
				else instanceType='object';
				break;
			case 'boolean': instanceType='boolean'; break;
			case 'string': instanceType='string'; break;
			case 'number': instanceType='number'; break;
			default: instanceType='any'; break;
		}

		if(schema.type.indexOf(instanceType)<0){
			schema.type = schema.type.concat([instanceType]).sort();
		}

		if(instanceType=='object'){
			schema.properties = schema.properties || {};
			for(var k in instance){
				if(!Object.prototype.hasOwnProperty.call(instance, k)) continue;
				schema.properties[k] = schema.properties[k] || {};
				updateSchema(schema.properties[k], instance[k]);
			}
		}else if(instanceType=='array'){
			schema.items = schema.items || {};
			instance.forEach(function(v){
				updateSchema(schema.items, v);
			});
		}
	}

	collection.find({}).each(function(err, doc){
		if(err || !doc) return void end(err);
		updateSchema(schema, doc);
	});

	function cleanSchema(schema){
		if(schema.type && schema.type.length===1) schema.type=schema.type[0];
		if(schema.properties) for(var n in schema.properties){
			cleanSchema(schema.properties[n]);
		}
		if(schema.items) cleanSchema(schema.items);
		delete schema.examples;
	}

	function end(){
			cleanSchema(schema);
			body += '<h2>Derived Schema</h2>';
			body += '<pre>'+escapeHTML(JSON.stringify(schema, null, "\t"))+'</pre>';
			callback(null, {"http://magnode.org/HTMLBody":body});
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeMongoDBCollection_Schema";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:Core']
	, 'view:domain': {$list:['type:MongoDBCollection_Schema']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyBlock_ResourceMenu']
	};
