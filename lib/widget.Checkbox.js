var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-checkbox">'+(instance?'true':'false')+'</div>';
}

function generateForm(name, instance, schema){
	return '<input name="'+escapeHTMLAttr(name)+'" value="1" type="checkbox" class="field-checkbox"'+(instance?' checked="1"':'')+'/>';
}

function parseForm(name, fieldData){
	if(!fieldData[name] || fieldData[name].length===0) return undefined;
	if(fieldData[name]==='0') return false; // Handle "0" as a special case, in case it becomes necessary
	return !!fieldData[name];
}

module.exports = require('./scan.widget').create('Checkbox', generateHTML, generateForm, parseForm);
