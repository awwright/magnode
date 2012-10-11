var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

module.exports = function HTMLBodyField_typeNode_FieldJSON(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/json'];

	var name = inputResource.name;
	var value = inputResource.value;

	var out = '<textarea name="value.'+escapeHTMLAttr(name)+'" class="field-json">'+escapeHTMLAttr(JSON.stringify(value,null,"\t"))+'</textarea>';
	out += '<input type="hidden" name="format.'+escapeHTMLAttr(name)+'" value="FormFieldElementJSON"/>';
	var ret = {};
	outputTypes.forEach(function(v){ret[v]=out;});
	callback(null, ret);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldJSON';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/json']}
	, 'view:range': 'type:HTMLBodyField'
	}
