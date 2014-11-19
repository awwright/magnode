var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-number">'+escapeHTML(instance)+'</div>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(instance||'')+'" type="text" class="field-number"/>';
}

function parseForm(name, fieldData){
	if(!fieldData[name] || fieldData[name].length===0) return undefined;
	return parseFloat(fieldData[name]);
}

module.exports = require('./scan.widget').create('Number', generateHTML, generateForm, parseForm);
