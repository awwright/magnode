function generateHTML(name, instance, schema){
	return '<i>undefined</i>';
}

function generateForm(name, instance, schema){
	// This widget only has one value, so it can't be editable
	return '<i>undefined</i>';
}

function parseForm(name, fieldData){
	return undefined;
}

module.exports = require('./scan.widget').create('undefined', generateHTML, generateForm, parseForm);
