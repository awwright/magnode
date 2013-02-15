var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<pre class="field-objectid">'+escapeHTML(instance.toString())+'</pre>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'.value" value="'+escapeHTMLAttr(instance)+'" type="text" class="field-objectid"/>';
}

function parseForm(name, fieldData){
	var value = fieldData[name+'.value'];
	return value?new ObjectId(value):undefined;
}

module.exports = require('./scan.widget').create('ObjectId', generateHTML, generateForm, parseForm);
