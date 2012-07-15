/*
e.g. Transform:DocumentHTML_BodyAuto_typeType_Form
	a view:ModuleTransform, view:FormTransform ;
	view:module "magnode/transform.DocumentHTML_BodyAuto_typeMongoDB_Form" ;
	view:range type:DocumentHTML_Body ;
	view:domain type:ContentType .
*/
var util=require('util');
var url=require('url');
var render=require('./view');
var escapeHTML=require('./htmlutils').escapeHTML;

function getTypeString(node){
	if(typeof(node)=="string") return "URI";
	if(!node) return "";
	if(typeof(node.language)=="string") return "@"+node.language;
	if(typeof(node.type)=="string") return node.type;
	return "";
}

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var templateInputType = db.filter({subject:transform,predicate:"http://magnode.org/view/domain"}).map(function(v){return v.object;});
	var templateOutputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var templateInverse = db.filter({subject:transform,predicate:"http://magnode.org/view/inverse"}).map(function(v){return v.object;});
	var inputResource = input[templateInputType[0]];
	//var templateFile = input.db.filter({subject:templateOutputType[0],predicate:"http://magnode.org/view/file"})[0].object.toString();
	var fields = [];
	var tail = [];
	var node = input.node;

	input['db-mongodb-schema'].findOne({subject:templateInputType[0]}, function(err, schema){
		if(!node.subject) node.subject=node.resource;
		var properties = schema&&schema.schema&&schema.schema.properties||{};
		var nodeFields = Object.keys(properties);
		renderFields(properties, node, nodeFields, {}, haveRenderedFields);
	});


	function renderFields(properties, node, fieldList, renderedFields, cb){
		var self=this;
		var fieldName=fieldList.shift();
		if(!fieldName) return cb(null, renderedFields, properties);
		var targetType = 'http://magnode.org/DocumentHTML_BodyField';
		var fieldType = properties[fieldName].format;
		var fieldValue = (node[fieldName]!==undefined)?node[fieldName]:(properties[fieldName].default===undefined?"":properties[fieldName].default);
		// Some builtin JSON formats need to be mapped to URIs
		var typeMap =
			{ uri: 'http://magnode.org/field/uri'
			, json: 'http://magnode.org/field/json'
			};
		fieldType = typeMap[fieldType]||fieldType;
		var input = {};
		input[fieldType] = {};
		for(var n in properties[fieldName]) input[fieldType][n] = properties[fieldName][n];
		input[fieldType].name = fieldName;
		input[fieldType].value = fieldValue;
		var transformTypes = [];
		console.log(fieldType);
		render.render(targetType, input, transformTypes, function(err, res){
			console.log(arguments);
			if(err) return cb(err);
			if(res && res[targetType]){
				renderedFields[fieldName] = res[targetType];
			}else{
				renderedFields[fieldName] = '<pre>'+htmlEscape(util.inspect(node[fieldName]))+'</pre><input type="hidden" name="format.'+htmlEscape(fieldName)+'" value="noop"/>';
			}
			renderFields(properties, node, fieldList, renderedFields, cb);
		});
	}

	function haveRenderedFields(err, renderedFields, properties){
		var fieldNames = [];
		for(var n in properties){
			switch(properties[n].format){
				case 'hidden': tail.push('<input type="hidden" name="format.'+escapeHTML(n)+'" value="noop"/>');
					continue;
			}
			var fieldTitle = properties[n].title||n;
			fields.push("<dt>"+escapeHTML(fieldTitle)+"</dt><dd>"+renderedFields[n]+"</dd>");
			fieldNames.push(n);
		}

		for(var n in node){
			if(properties[n]) continue;
			fields.push('<dt>'+escapeHTML(n)+'</dt><dd><textarea name="value.'+escapeHTML(name)+'">'+escapeHTML(JSON.stringify(value,null,"\t"))+'</textarea><input type="hidden" name="format.'+escapeHTML(name)+'" value="json"/></dd>');
			fieldNames.push(n);
		}

		var action = url.parse(input.request.url, true);
		delete(action.search);
		delete(action.query.new);
		action.query.edit=true;
		//action.query.apply = ['http://magnode.org/transform/Post-form-urlencoded',templateInverse[0]];
		result =
			'<form action="'+escapeHTML(url.format(action))+'" method="post">'
			+ "<dl>"+fields.join("")+"</dl>"
			+ '<input type="hidden" name="_id" value="'+escapeHTML(node._id||"")+'"/>'
			+ '<input type="hidden" name="fields" value="'+escapeHTML(JSON.stringify(fieldNames))+'"/>'
			+ '<input type="submit" value="Submit"/>'
			+ tail.join('');
			+ '</form>';
		var output = {};
		for(var j=0;j<templateOutputType.length;j++){
			output[templateOutputType[j]] = result;
		}
		callback(output);
	}
}
