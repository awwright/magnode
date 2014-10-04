var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<pre class="field-date">'+escapeHTML(instance.toString())+'</pre>';
}

function generateForm(name, instance, schema){
	if(instance===undefined) instance=schema.dateDefault;
	return '<input name="'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(instance)+'" type="text" class="field-date"/>';
}

function parseForm(name, fieldData){
	var value = fieldData[name];
	return (!value || value.toLowerCase()=='now')?new Date():new Date(value);
}

module.exports = require('./scan.widget').create('Date', generateHTML, generateForm, parseForm);
