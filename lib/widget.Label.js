var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-label">'+escapeHTML(instance)+'</div>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'.value" value="'+escapeHTMLAttr(instance||'')+'" type="text" class="field-label"/>';
}

function parseForm(name, fieldData){
	return fieldData[name+'.value'] || undefined;
}

module.exports = require('./scan.widget').create('Label', generateHTML, generateForm, parseForm);
