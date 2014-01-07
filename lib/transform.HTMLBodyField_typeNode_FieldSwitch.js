var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var schema = input['http://magnode.org/field/Switch'];
	var name = schema.name;
	var instance = schema.value || '';

	var types = schema.type || [];
	if(!Array.isArray(types)) types=[types];
	if(types.indexOf('any')>=0 || !types.length){
		// Not defined? Show them all
		types=['object','string','number','boolean','array','null'];
	}
	if(!schema.required) types.push('undefined');
	var html = '';
	html += '<div class="field-switch">';
	html += '<select name="'+escapeHTMLAttr(name)+'.select">';
	html += types.map(function(v){ return '<option>'+escapeHTML(v)+'</option>' }).join('');
	html += '</select>';
	html += '<dl>';
	html += types.map(function(v){
		return '<dt>'+escapeHTML(v)+'</dt>'
			+'<dd>'+escapeHTML(v)+': <input name="'+escapeHTMLAttr(name)+'.'+escapeHTMLAttr(v)+'.value" value="'+escapeHTMLAttr(instance||'')+'"/></dd>';
	}).join('');
	html += '</dl>';
	html += '</div>';

	var ret = {};
	outputTypes.forEach(function(v){ret[v]=html;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldSwitch';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/Switch']}
	, 'view:range': 'type:HTMLBodyField'
	}
