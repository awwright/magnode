var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-checkbox">'+(instance?'true':'false')+'</div>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'.value" value="1" type="checkbox" class="field-checkbox"'+(instance?' checked="1"':'')+'/>';
}

function parseForm(name, fieldData){
	if(!fieldData[name+'.value'] || fieldData[name+'.value'].length===0) return undefined;
	return !!fieldData[name+'.value'];
}

module.exports = require('./scan.widget').create('Checkbox', generateHTML, generateForm, parseForm);
