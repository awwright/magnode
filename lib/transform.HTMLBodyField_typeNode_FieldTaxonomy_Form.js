var util=require('util');
var url=require('url');

var render=require('./render');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// FIXME: Make this non-specific to MongoDB. Perhaps make a URL router call to figure out what types the resource is of.

module.exports = function generateTransform(db, transform, resources, render, callback){
	var field = resources['http://magnode.org/field/Taxonomy'];
	var db = resources['db-mongodb-nodes'];
	var items = field.value;
	var bins = field.taxonomySources ||
		[
			{ taxonomyFilter: 'http://magnode.org/MongoDBJSONSchema'
			, type: 'string'
			, label: 'Schema'
			, format: "uri"
			, widget: "http://magnode.org/field/selectresource"
			, range: "http://magnode.org/MongoDBJSONSchema"
			, selectLabel: "label"
			, selectNull: true
			, undefinedIf: ["",null]
			, default: "" }
		];
	bins.push({taxonomyFilter:'remainder', type:'array', items:{type:'string', format:'uri'}, label:'Other'});
	var headings = {};
	var binValues = {};
	bins.forEach(function(v){
		headings[v.taxonomyFilter] = v;
		binValues[v.taxonomyFilter] = [];
	});

	function nextItem(i){
		var item = items && items[i];
		if(item===undefined) return void nextBin(0);
		db.findOne({subject:item}, function(err, doc){
			if(err) return void callback(err);
			var type = doc&&doc.type || [];
			//console.log(item, type.join());
			var m = type.some(function(t){
				if(headings[t]){
					//console.log('Push:',t);
					binValues[t].push(item);
					return true;
				}
			});
			if(!m) binValues['remainder'].push(item);
			nextItem(i+1);
		})
	}

	var renderedBins = {};
	function nextBin(i){
		var bin = bins[i];
		if(bin===undefined) return void end();

		var subfield = Object.create(bin);
		subfield.name = field.name+'.'+i;
		if(subfield.type && subfield.type!='array'){
			subfield.value = binValues[bin.taxonomyFilter][0];
			for(var j=1; j<binValues[bin.taxonomyFilter].length; j++){
				binValues['remainder'].push(binValues[bin.taxonomyFilter][j]);
			}
		}
		else subfield.value = binValues[bin.taxonomyFilter];

		var inputType = subfield.widget || 'http://magnode.org/field/array';
		var targetType = 'http://magnode.org/HTMLBodyField';
		// Prototype because the input shouldn't include any resource-related objects
		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;
		input[inputType] = subfield;
		// FIXME this should be resolved?
		//subfield.base = subfield.id || schemaBase;
		var transformTypes = ['http://magnode.org/view/PutFormTransform'];
		render.render(targetType, input, transformTypes, function(err, res){
			// if(err) return void haveRenderedFields(err);
			if(res && res[targetType]){
				renderedBins[bin.taxonomyFilter] = res[targetType];
			}else{
				renderedBins[bin.taxonomyFilter] = '<ul>'+binValues[bin.taxonomyFilter].map(function(v){return '<li>'+v+'</li>';})+'</ul>'
			}
			nextBin(i+1);
		});

	}

	function end(){
		var value = '<dl>'+bins.map(function(v){return '<dt>'+escapeHTML(v.label||v.taxonomyFilter)+'</dt><dd>'+renderedBins[v.taxonomyFilter]+'</dd>';}).join('')+'</dl>';
		value += '<input type="hidden" name="'+escapeHTMLAttr(field.name)+'.length" value="'+bins.length+'" />';
		value += '<input type="hidden" name="'+escapeHTMLAttr(field.name)+':format" value="ConcatArray" />';
		var outputs = {};
		outputs['http://magnode.org/HTMLBodyField'] = value;
		callback(null, outputs);
	}

	nextItem(0);
}

module.exports.URI = 'http://magnode.org/transform/HTMLBodyField_typeNode_FieldTaxonomy_Form';
module.exports.about =
	{ a: ['view:Transform', 'view:PutFormTransform']
	, 'view:domain': {$list:['http://magnode.org/field/Taxonomy']}
	, 'view:range': 'type:HTMLBodyField'
	}
