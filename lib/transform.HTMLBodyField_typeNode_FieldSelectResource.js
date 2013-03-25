var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var escapeHTML = require('./htmlutils').escapeHTML;

// NOTE: Keep in mind no sort of domain checking is done on the server end.
// It's up to the server end to validate the input data with the database schema.

module.exports = function HTMLBodyField_typeNode_FieldSelectResource(db, transform, input, render, callback){
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var inputResource = input['http://magnode.org/field/selectresource'];

	var name = inputResource.name;
	var value = inputResource.value;
	var range = inputResource.range;
	var db = input['db-mongodb'];
	var options = [];
	if(inputResource.selectNull) options.push('<option value=""></option>');
	var selectLabel = inputResource.selectLabel||'label';
	var queryRange = {subject:1};
	if(selectLabel) queryRange[selectLabel]=1;
	db.find({type:range}, queryRange).forEach(function(doc){
		var label = selectLabel&&(doc[selectLabel]+' ') || '';
		var selected = '';
		if(value===doc.subject) selected=' selected="selected"';
		options.push('<option value="'+escapeHTMLAttr(doc.subject)+'"'+selected+'>'+escapeHTML(label)+'&lt;'+escapeHTML(doc.subject)+'&gt;</option>');
	}, haveOptions);

	function haveOptions(err){
		if(err) return void callback(err);
		var out = '<select name="'+escapeHTMLAttr(name)+'.value" value="'+escapeHTMLAttr(value)+'" class="field-select-resource">'+options.join('')+'</select>';
		out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.format" value="URI"/>';
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=out;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldSelectResource';
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/selectresource']}
	, 'view:range': 'type:HTMLBodyField'
	}
