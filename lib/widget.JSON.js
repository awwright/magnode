var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var serializeJSON = require('./mongoutils').serializeJSON;
var parseJSON = require('./mongoutils').parseJSON;

function generateHTML(name, instance, schema){
	return '<pre class="field-json">'+escapeHTML(JSON.stringify(instance,null,"\t"))+'</pre>';
}

function generateForm(name, instance, schema){
	return '<textarea name="'+escapeHTMLAttr(name)+'" class="field-json">'+escapeHTML(serializeJSON(instance))+'</textarea>';
}

function parseForm(name, fieldData){
	var str = fieldData[name];
	if(str=='undefined') return;
	return str ? parseJSON(str) : undefined;
}

module.exports = require('./scan.widget').create('JSON', generateHTML, generateForm, parseForm);
