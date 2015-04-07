/* Escape plain text to XML safe for HTML attributes and cdata */
module.exports.escapeHTML = function escapeHTML(text){
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

module.exports.escapeHTMLAttr = function escapeHTMLAttr(text){
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Escape a block of JSON sp as not to close the <script> tag
module.exports.escapeRawtextJSON = function escapeRawtextJSON(text){
	if(typeof text=='object') text=JSON.stringify(text);
	// These characters will never appear outside a "string" production, so escape all of them indiscriminately
	// Escaping these characters prevents users from closing any tags and entities (XML mode) and from forming a "</script" sequence (HTML)
	return String(text)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
}

// Escape a block of JavaScript so as not to <script> tag
module.exports.escapeRawtextJS = function escapeRawtextJS(text){
	// There's no easy way to do this without doing a near-complete parsing of the language
	// So just wrap it in a CDATA section which reduces the error conditions to just two multi-character strings (instead of any one of [<>&])
	var text = String(text);
	// If the string contains a prohibited character sequence (one that could escape parsing), abort
	if(text.indexOf(']]>')>=0 || text.match(/<\/script/i)>=0){
		throw new Error('Given code closes the script tag');
	}
	return '/*<![CDATA[*/\n' + text + '\n/*]]>*/';
}
