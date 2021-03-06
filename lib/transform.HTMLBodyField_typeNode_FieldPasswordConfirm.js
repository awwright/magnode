var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldURI(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/shadow'];

	var name = inputResource.name;
	var value = inputResource.value || '';

	var out = '';
	out += '<div><input type="password" name="'+escapeHTMLAttr(name)+'.new" value="" class="field-password-a"/><small>Enter a new password to change your current password</small></div>';
	out += '<div><input type="password" name="'+escapeHTMLAttr(name)+'.confirm" value="" class="field-password-b"/><small>Confirm new password</small></div>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.value" value="'+escapeHTMLAttr(value)+'"/>';
	out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.format" value="Shadow"/>';
	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldPasswordConfirm';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform', 'view:Core']
	, 'view:domain': {$list:['http://magnode.org/field/shadow']}
	, 'view:range': 'type:HTMLBodyField'
	}
