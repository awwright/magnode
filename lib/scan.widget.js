var resolvePath=require('path').resolve;
var cwd = process.cwd();
var rdf=require('rdf');

var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports.scanDirectorySync = function(dir, render){
	var environment = new rdf.RDFEnvironment();
	environment.setPrefix('Transform', 'http://magnode.org/transform/');
	environment.setPrefix('view', 'http://magnode.org/view/');
	environment.setPrefix('type', 'http://magnode.org/');

	function importTransform(module){
		if(!module) return;
		var graph = rdf.parse(module.about, module.URI).graphify(environment);
		render.db.importArray(graph.toArray());
		render.renders[module.URI]=module;
	}

	// Go through directory, return RDF facts about transforms within it
	// Searching in this manner is rather arbritary but it works
	var readdirFiles = require('fs').readdirSync(dir);
	var files = [];
	for(var i=0; i<readdirFiles.length; i++){
		var path = resolvePath(cwd, dir, readdirFiles[i]);
		if(!readdirFiles[i].match(/^widget\./)) continue;
		var module = require(path);
		if(module instanceof widgetDefinition){
			console.log('Widget import: '+module.fieldName);
			importTransform(module.makeGetTransform());
			importTransform(module.makeFormTransform());
			importTransform(module.makePostTransform());
		}
	}
}

module.exports.create = function(html, fieldType, form, parseForm){
	return new widgetDefinition(html, fieldType, form, parseForm);
}

// There's several types of URIs used for widget creation
// (1) The schema + instance (found at <field/*>)
// (2) The rendered widget, either form or readonly (typically called with simply <HTMLBodyField>)
// (3) Metadata for describing how a form was posted to the server (found at <FormFieldElement*>)
// (4) The raw JSON instance (found at <FieldValue>)

function widgetDefinition(fieldName, html, form, parseForm){
	this.fieldName = fieldName;
	this.fieldData = 'http://magnode.org/field/'+fieldName;
	this.fieldForm = 'http://magnode.org/HTMLBodyField'+fieldName;
	this.fieldPost = 'http://magnode.org/fieldpost/'+fieldName;
	this.fieldValue = 'http://magnode.org/FieldValue'+fieldName;
	this.html = html;
	this.form = form;
	this.parseForm = parseForm;
}
widgetDefinition.prototype.fieldName = null;
widgetDefinition.prototype.fieldForm = null;
widgetDefinition.prototype.fieldData = null;
widgetDefinition.prototype.fieldPost = null;
widgetDefinition.prototype.html = null;
widgetDefinition.prototype.form = null;
widgetDefinition.prototype.parseForm = null;

widgetDefinition.prototype.makeGetTransform = function(){
	if(!this.html) return;
	var self = this;
	function viewTransform(db, transform, input, render, callback){
		var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
		var inputData = input['http://magnode.org/FormFieldData'];
		var inputElement = input[self.fieldData];
		try{
			var value = self.html(inputElement.name, inputElement.value, inputElement);
		}catch(e){
			return void callback(e);
		}
		var ret = {};
		outputTypes.forEach(function(v){ret[v] = value;});
		callback(null, ret);
	}
	viewTransform.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_Field'+self.fieldName;
	viewTransform.about =
		{ a: ['view:Transform', 'view:GetTransform']
		, 'view:domain': {$list:[self.fieldData]}
		, 'view:range': ['type:HTMLBodyField', self.fieldForm]
		}
	return viewTransform;
}

widgetDefinition.prototype.makeFormTransform = function(){
	if(!this.form) return;
	var self = this;
	function viewTransform(db, transform, input, render, callback){
		var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
		var inputData = input['http://magnode.org/FormFieldData'];
		var inputElement = input[self.fieldData];
		try{
			var out = self.form(inputElement.name, inputElement.value, inputElement);
		}catch(e){
			return void callback(e);
		}
		out += '<input type="hidden" name="'+escapeHTMLAttr(inputElement.name)+'.format" value="'+self.fieldName+'"/>';
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=out;});
		callback(null, ret);
	}
	viewTransform.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_Field'+self.fieldName+'_Form';
	viewTransform.about =
		{ a: ['view:Transform', 'view:PutFormTransform']
		, 'view:domain': {$list:[self.fieldData]}
		, 'view:range': ['type:HTMLBodyField', self.fieldForm]
		}
	return viewTransform;
}

widgetDefinition.prototype.makePostTransform = function(){
	if(!this.parseForm) return;
	var self = this;
	function postTransform(db, transform, input, render, callback){
		var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
		var inputData = input['http://magnode.org/FormFieldData'];
		var inputElement = input[self.fieldPost];
		try{
			var value = self.parseForm(inputElement.name, inputData);
		}catch(e){
			return void callback(e);
		}
		var ret = {};
		outputTypes.forEach(function(v){ret[v] = value;});
		callback(null, ret);
	}
	postTransform.URI = 'http://magnode.org/transform/FieldValue_typeFormFieldElement'+self.fieldName;
	postTransform.about =
		{ a: ['view:Transform', 'view:FormDataTransform']
		, 'view:domain': {$list:['type:FormFieldData', self.fieldPost]}
		, 'view:range': ['type:FieldValue', self.fieldValue]
		};
	return postTransform;
}
