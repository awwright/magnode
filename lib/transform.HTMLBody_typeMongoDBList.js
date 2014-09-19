
var jade = require('jade');
var escapeHTML = require('magnode').require('htmlutils').escapeHTML;
var Uritpl = require('uri-templates');
var rdf = require('rdf');
var IRI = require('iri').IRI;
var rdfenv = rdf.environment;
var relns = rdf.ns('http://www.iana.org/assignments/relation/');

var relativeURI = require('./relativeuri');

/* Evaluates and renders a MongoDB query on a collection to HTML
*/

module.exports = transform;
function transform(db, transform, resources, render, callback){
	var res = resources.response;
	var rdf = resources.rdf;
	var mongodb = resources['db-mongodb']; // FIXME maybe make this selectable at init-time?
	var query = resources['http://magnode.org/MongoDBList'];
	if(!query) return void callback(new Error('No MongoDBList found'));
	if(!query.collection) return void callback(new Error('No collection specified'));
	var options = {};
	if(query.sort){
		options.sort = query.sort.map(function(v){ return [v.key||v.field, v.dir||v.order||1]; });
	}
	var pager = resources.variant.pager || {limit:200};
	options.limit = pager.limit || query.pager.limit;
	if(pager.offset){
		options.skip = pager.offset;
		//page = Math.floor(parseInt(action.query.offset)/query.pager.limit);
	}else if(pager.page && options.limit){
		//page = parseInt(action.query.page);
		options.skip = Math.floor(pager.page*options.limit);
	}
	var html = '';
	if(query.label) html += '<h1>'+query.label+'</h1>';
	var recordsHtml = [];
	var cursor = mongodb.collection(query.collection).find(query.filter, options);
	cursor.next(nextRecord);
	var outputType = query.output_type;
	var recordType = query.record_type;
	if(!recordType){
		switch(outputType){
			case 'list':case 'ul':case 'ol': recordType='li';  break;
			case 'table': recordType='tr'; break;
			default: recordType='json'; break;
		}
	}
	var linkTemplates = query.schema&&query.schema.links || [];
	linkTemplates = linkTemplates.map(function(v){ return {rel:new IRI(relns('')).resolveReference(v.rel).toString(), tpl:new Uritpl(v.href)}; });
	function renderField(field, record, linkRels){
		var html;
		if(field.text_content_field){
			html = escapeHTML(record[field.text_content_field]);
		}else if(field.html_content_field){
			html = record[field.html_content_field];
		}else{
			html = escapeHTML(field);
		}
		if(html=='' && field.text_if_empty){
			html = field.text_if_empty;
		}
		var relUri = field.link_href_rel && new IRI(relns('')).resolveReference(field.link_href_rel).toString();
		if(field.link_href_field && record[field.link_href_field]){
			// TODO resolve the href, or make it relative to the document URL
			html = '<a href="'+escapeHTML(relativeURI(rdf, record[field.link_href_field]))+'">'+html+'</a>';
		}else if(linkRels[relUri]){
			// TODO calculate the link relation using the JSON Hyper-schema and output here
			// Typically, the relation will be "self"
			// Note that the rel attribute cannot be passed to the link because the source document is different
			html = '<a href="'+escapeHTML(relativeURI(rdf, linkRels[relUri]))+'">'+html+'</a>';
		}
		return html;
	}
	function nextRecord(err, result){
		if(err) return void callback(err);
		if(!result) return void finished();
		var html = '';
		var links = [];
		var instanceSubject = rdfenv.createBlankNode();
		var linkRels = {};
		linkTemplates.forEach(function(v){
			var object = v.tpl.fillFromObject(result);
			// FIXME v.rel is a relative URI, not merely a CURIE
			var predicate = rdfenv.createNamedNode(v.rel);
			links.push(rdfenv.createTriple(instanceSubject, predicate, rdfenv.createNamedNode(object)));
			linkRels[predicate] = object;
		});
		if(recordType==='li'){
			html += '<li>';
			if(query.field){
				html += renderField(query.field || query.fields[0], result, linkRels);
			}else if(query.fields){
				query.fields.forEach(function(field){
					// FIXME maybe use a zero-width space here instead
					html += '<span>'+renderField(field, result, linkRels)+'</span> ';
				});
			}
			html += '</li>';
		}else if(recordType==='tr'){
			html += '<tr>';
			query.fields.forEach(function(field){
				html += '<td>'+renderField(field, result, linkRels)+'</td>';
			});
			html += '</tr>';
		}else if(recordType==='dl'){
			html += '<dl class="list-item-unformatted">';
			query.fields.forEach(function(field){
				html += '<dt>'+escapeHTML(field.label)+'</dt>\n';
				html += '<dd>'+renderField(field, result, linkRels)+'</dd>\n';
			});
			html += '</dl><hr/>';
		}else if(recordType==='story'){
			// This is really just for example
			// If you need to format something like this, use record_type:"format"
			html += '<div class="list-item-story">';
			html += '<h2><a href="'+escapeHTML(linkRels[relns('self')])+'">'+escapeHTML(result.label)+'</a></h2>\n';
			//html += '<dl>'+links.map(function(v){ return '<dt>'+escapeHTML(v.rel)+'</dt><dd>'+escapeHTML(v.href)+'</dd>'; }).join('')+'</dl>\n';
			html += '<div class="list-item-story-body">'+result.body+'</div>\n';
			html += '<div class="link-wrapper"><ul class="links inline"><li class="node-readmore first"><a href="'+escapeHTML(linkRels[relns('self')])+'" rel="tag" title="$title">Read more: $title</a></li></ul></div>';
			html += '</div>';
		}else if(recordType==='format'){
			// And hiding wwaaayyy down here is the recordType for defining your own formatter for a record
			// FIXME/TODO Parse the JSON Meta-schema for type information
			var srcTypes = query.sourceType || result.type || [];

			// Don't use the request details in this rendering, but make it available if needed
			var input = Object.create(Object.getPrototypeOf(resources.requestenv));
			input.requestenv = resources.requestenv;

			input.node = result;
			// FIXME shouldn't this be input.resource?
			input.subject = result.subject;
			//var input = {node:result, subject:post.subject, rdf:resources.rdf};
			srcTypes.forEach(function(v){ input[v]=result; });
			var targetType = query.targetType;
			var transformTypes = ['http://magnode.org/view/GetTransform'];
			render.render(targetType, input, transformTypes, function(err, res){
				if(err) return void callback(err);
				var html;
				if(res && res[targetType]){
					html = res[targetType];
				}else{
					html = '<pre class="field-default">None</pre>';
				}
				recordsHtml.push(html);
				cursor.next(nextRecord);
			});
			return;
		}else{
			html += '<pre class="list-unformatted-item">'+escapeHTML(JSON.stringify(result,null,"\t"))+'</pre>';
		}
		recordsHtml.push(html);
		cursor.next(nextRecord);
	}
	function finished(){
		if(outputType==='list' || outputType==='ul' || outputType==='ol'){
			html += '<ul>';
			html += recordsHtml.join('\n');
			html += '</ul>';
		}else if(outputType==='table'){
			html += '<table>';
			html += '<thead><tr>';
			query.fields.forEach(function(field){
				html += '<th>'+escapeHTML(field.label)+'</th>\n';
			});
			html += '</tr></thead><tbody>';
			html += recordsHtml.join('\n');
			html += '</tbody></table>';
		}else if(outputType==='unformatted' || outputType==='unformatted-field' || outputType==='unformatted-story'){
			html += '<div class="list-unformatted">';
			html += recordsHtml.join('\n');
			html += '</div>';
		}else{
			html += 'Unknown query type '+escapeHTML(JSON.stringify(outputType));
		}

		var result;
		var pagerType = 'http://magnode.org/HTMLBodyPager';
		var pagerInput = Object.create(resources.requestenv);
		//input.variant = resources.variant;
		cursor.count(function(err, resultCount){
			if(err) return void callback(err);
			pagerInput['http://magnode.org/Pager'] = {offset:options.skip, limit:options.limit, resultCount:resultCount};
			render.render(pagerType, pagerInput, [], haveRenderedPager);
		});
		function haveRenderedPager(err, resources){
			if(err) return void callback(err);
			html += resources[pagerType];
			callback(null, {'http://magnode.org/HTMLBody':html});
		}
	}
}
transform.about = {
	id: 'http://magnode.org/transforms/HTMLBody_typeMongoDBList',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
	domain: ['http://magnode.org/MongoDBList'],
	range: ['http://magnode.org/HTMLBody'],
};
