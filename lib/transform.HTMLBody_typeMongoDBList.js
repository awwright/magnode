
var jade = require('jade');
var escapeHTML = require('magnode').require('htmlutils').escapeHTML;
var Uritpl = require('uri-templates');

var relativeURI = require('./relativeuri');

module.exports = transform;
function transform(db, transform, resources, render, callback){
	var res = resources.response;
	var rdf = resources.rdf;
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
	var html = '<h1>Collection '+(query.label||query.collection)+'</h1>';
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
		if(field.link_href_field && record[field.link_href_field]){
			// TODO resolve the href, or make it relative to the document URL
			html = '<a href="'+escapeHTML(relativeURI(rdf, record[field.link_href_field]))+'">'+html+'</a>';
		}else if(field.link_href_rel && linkRels[field.link_href_rel]){
			// TODO calculate the link relation using the JSON Hyper-schema and output here
			// Typically, the relation will be "self"
			// Note that the rel attribute cannot be passed to the link because the source document is different
			html = '<a href="'+escapeHTML(relativeURI(rdf, linkRels[field.link_href_rel]))+'">'+html+'</a>';
		}
		return html;
	}
	function nextRecord(err, result){
		if(err) return void callback(err);
		if(!result) return void finished();
		var html = '';
		//var links = [];
		var linkRels = {};
		linkTemplates.forEach(function(v){
			var tpl = new Uritpl(v.href);
			var object = tpl.fillFromObject(result);
			// FIXME use a bnode or an actual "self" URI
			//links.push(new rdf.Triple('http://example.com/', v.rel, object));
			linkRels[v.rel] = object;
		});
		if(recordType==='li'){
			html += '<li>';
			html += renderField(query.field || query.fields[0], result, linkRels);
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
			html += '<h2><a href="/story/'+escapeHTML(result.slug)+'">'+escapeHTML(result.label)+'</a></h2>\n';
			html += '<div class="list-item-story-body">'+result.body+'</div>\n';
			html += '<div class="link-wrapper"><ul class="links inline"><li class="node-readmore first"><a href="/story/'+escapeHTML(result.slug)+'" rel="tag" title="$title">Read more: $title</a></li></ul></div>';
			html += '</div>';
		}else if(recordType==='format'){
			// And hiding wwaaayyy down here is the recordType for defining your own formatter for a record
			// FIXME/TODO Parse the JSON Meta-schema for type information
			var srcTypes = listposts.sourceType || post.type || [];

			// Don't use the request details in this rendering, but make it available if needed
			var input = Object.create(Object.getPrototypeOf(resources.requestenv));
			input.requestenv = resources.requestenv;

			input.node = post;
			// FIXME shouldn't this be input.resource?
			input.subject = post.subject;
			//var input = {node:post, subject:post.subject, rdf:resources.rdf};
			srcTypes.forEach(function(v){ input[v]=post; });
			var transformTypes = ['http://magnode.org/view/GetTransform'];
			render.render(targetType, input, transformTypes, function(err, res){
				if(err) return void callback(err);
				var postBody;
				if(res && res[targetType]){
					postBody = res[targetType];
				}else{
					postBody = '<pre class="field-default">'+escapeHTML(util.inspect(post))+'</pre>';
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
	id: 'http://johtoradio.com/transforms/HTMLBody_typeMongoDBList',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform'],
	domain: ['http://magnode.org/MongoDBList'],
	range: ['http://magnode.org/HTMLBody'],
};
