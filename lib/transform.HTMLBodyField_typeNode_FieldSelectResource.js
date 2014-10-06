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
	var db = input['db-mongodb-nodes'];
	var options = [];
	if(!inputResource.multi && inputResource.selectNull) options.push('<option value=""></option>');
	var labelProperty = inputResource.selectLabel||'label';
	var queryRange = {subject:1};
	if(labelProperty) queryRange[labelProperty]=1;
	var i = 0;
	var found = false;
	// FIXME this is somewhat obsolete, use an index?
	db.find({type:range, subject:{$exists:true}}, queryRange).each(function(err, doc){
		if(err || !doc) return void haveOptions(err);
		var label = labelProperty && doc[labelProperty];
		if(label) label += ' ';
		var subject = doc.subject || '';
		// FIXME this should be done at the mongodb level...
		// This is really only here so keys with URI values, like the "menu" object of many documents, is suitable for MongoDB
		if(inputResource.escape=='mongodb'){
			subject = subject.replace(/%/g,'%25').replace(/\x2E/g, '%2E').replace(/\x24/g, '%24');
		}
		if(inputResource.selectMulti && value instanceof Array){
			var selected = (value.indexOf(subject)>=0)?' checked="checked"':'';
			options.push('<label><input type="checkbox" name="'+escapeHTMLAttr(name)+'.'+(i)+'" value="'+escapeHTMLAttr(subject)+'"'+selected+' /><input type="hidden" name="'+escapeHTMLAttr(name)+'.'+(i++)+'":format" value="URI"/>'+escapeHTML(label)+'&lt;'+escapeHTML(doc.subject)+'&gt;</label>');
		}else{
			var selected = (value===subject)?' selected="selected"':'';
			options.push('<option value="'+escapeHTMLAttr(subject)+'"'+selected+'>'+escapeHTML(label)+'&lt;'+escapeHTML(doc.subject)+'&gt;</option>');
		}
		if(value===subject) found=true;
	});

	function haveOptions(err){
		if(err) return void callback(err);
		if(!found){
			options.push('<option selected="selected">'+escapeHTML(value)+'</option>');
		}
		if(inputResource.selectMulti){
			var out = '<ul class="field-select-resource">'+options.join('')+'</ul>';
			out += '<input type="hidden" name="'+escapeHTMLAttr(name)+':format" value="Array"/>';
			out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.items" value="URI"/>';
			out += '<input type="hidden" name="'+escapeHTMLAttr(name)+'.length" value="'+i+'"/>';
		}else{
			var out = '<select name="'+escapeHTMLAttr(name)+'" value="'+escapeHTMLAttr(value)+'" class="field-select-resource">'+options.join('')+'</select>';
			out += '<input type="hidden" name="'+escapeHTMLAttr(name)+':format" value="URI"/>';
		}
		var ret = {};
		outputTypes.forEach(function(v){ret[v]=out;});
		callback(null, ret);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldSelectResource';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/selectresource']}
	, 'view:range': 'type:HTMLBodyField'
	}
