var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var ObjectId = require('mongodb').ObjectID;

function generateHTML(name, instance, schema){
	return '<pre class="field-objectid">'+escapeHTML(instance.toString())+'</pre>';
}

function generateForm(name, instance, schema){
	var className = 'field-objectid';
	if(schema.autocompleteEndpoint) className += ' field-autocomplete autocomplete-endpoint<' + schema.autocompleteEndpoint + '>';
	return '<input name="'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(instance)+'" type="text" class="'+escapeHTMLAttr(className)+'"/>';
}

function parseForm(name, fieldData){
	var value = fieldData[name];
	return value?new ObjectId(value):undefined;
}

module.exports = require('./scan.widget').create('ObjectId', generateHTML, generateForm, parseForm);
