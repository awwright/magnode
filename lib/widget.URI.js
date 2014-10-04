var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-uri">'+escapeHTML(instance)+'</div>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(instance||'')+'" type="text" class="field-uri"/>';
}

function parseForm(name, fieldData){
	return fieldData[name] || undefined;
}

module.exports = require('./scan.widget').create('URI', generateHTML, generateForm, parseForm);
