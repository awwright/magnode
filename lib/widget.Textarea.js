var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-textarea">'+escapeHTML(instance)+'</div>';
}

function generateForm(name, instance, schema){
	return '<textarea name="'+escapeHTMLAttr(name)+'.value" class="field-textarea">'+escapeHTML(instance)+'</textarea>';
}

function parseForm(name, fieldData){
	return fieldData[name+'.value'] || undefined;
}

module.exports = require('./scan.widget').create('Textarea', generateHTML, generateForm, parseForm);
