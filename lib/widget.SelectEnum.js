var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

function generateHTML(name, instance, schema){
	return '<div class="field-selectenum">'+escapeHTML(instance)+'</div>';
}

function generateForm(name, instance, schema){
	var values = (schema.enum instanceof Array)?schema.enum:[];
	var options = values.map(function(v){ return '<option'+(v==instance?' selected="selected"':'')+'>'+escapeHTML(v)+'</option>'; });
	return '<select name="'+escapeHTMLAttr(name)+'.value" class="field-selectenum">'+options+'</select>';
}

function parseForm(name, fieldData){
	return fieldData[name+'.value'] || undefined;
}

module.exports = require('./scan.widget').create('SelectEnum', generateHTML, generateForm, parseForm);
