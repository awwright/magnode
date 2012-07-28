/* Escape plain text to XML safe for HTML attributes and cdata */
module.exports.escapeHTML = function escapeHTML(text){
  return String(text)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports.escapeHTMLAttr = function escapeHTMLAttr(text){
	return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,'&quot;');
}
