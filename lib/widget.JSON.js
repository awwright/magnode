var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<pre class="field-json">'+escapeHTML(JSON.stringify(instance,null,"\t"))+'</pre>';
}

function generateForm(name, instance, schema){
	return '<textarea name="'+escapeHTMLAttr(name)+'" class="field-json">'+escapeHTML(JSON.stringify(instance,null,"\t"))+'</textarea>';
}

function parseForm(name, fieldData){
	var str = fieldData[name];
	if(str=='undefined') return;
	return str?JSON.parse(str):undefined;
}

module.exports = require('./scan.widget').create('JSON', generateHTML, generateForm, parseForm);
