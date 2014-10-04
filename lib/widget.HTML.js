var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-html">'+instance+'</div>';
}

function generateForm(name, instance, schema){
	return '<textarea name="'+escapeHTMLAttr(name)+'" class="field-html">'+escapeHTML(instance)+'</textarea>';
}

function parseForm(name, fieldData){
	return fieldData[name] || undefined;
}

module.exports = require('./scan.widget').create('HTML', generateHTML, generateForm, parseForm);
