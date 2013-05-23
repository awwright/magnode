var util=require('util');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, resources, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var cursor = resources['http://magnode.org/MongoCursorPosts'];
	var listposts = resources['http://magnode.org/MongoDB_ListPosts'];
	var targetType = listposts.targetType || 'http://magnode.org/HTMLBody';
	var renderedPosts = [];

	cursor.next(function nextPost(err, post){
		if(err) return void callback(err);
		if(!post) return finishedPosts(null, renderedPosts);

		// Lets assume the existance of post.subject and post.type
		var srcTypes = post.type || [];
		var input = Object.create(Object.getPrototypeOf(resources.requestenv));
		input.requestenv = resources.requestenv;

		input.node = post;
		input.subject = post.subject;
		//var input = {node:post, subject:post.subject, rdf:resources.rdf};
		srcTypes.forEach(function(v){ input[v]=post; });
		var transformTypes = ['http://magnode.org/view/ViewTransform'];
		render.render(targetType, input, transformTypes, function(err, res){
			if(err) return void callback(err);
			var postBody;
			if(res && res[targetType]){
				postBody = res[targetType];
			}else{
				postBody = '<pre class="field-default">'+escapeHTML(util.inspect(post))+'</pre>';
			}
			renderedPosts.push('<div>'+postBody+'</div><hr/>');
			cursor.next(nextPost);
		});
	});

	var result;
	var pagerType = 'http://magnode.org/HTMLBodyPager';
	function finishedPosts(err, renderedPosts){
		if(err) return void callback(err);
		result = '<div>'+renderedPosts.join("")+'</div>';
		//result += '<p>Showing '+renderedPosts.length+' of '+resultCount+' posts</p>';

		var input = Object.create(resources.requestenv);
		input['http://magnode.org/MongoCursor'] = cursor;
		transformTypes = [];
		render.render(pagerType, input, transformTypes, haveRenderedPager);
	}
	function haveRenderedPager(err, resources){
		if(err) return void callback(err);
		result += resources[pagerType];
		var output = {};
		outputType.forEach(function(v){ output[v] = result; });
		callback(null, output);
	}
}
// In addition to defining the transform for this, we also
// define the transform to generate the specific flavor of MongoCursor that we depend on
// FIXME: Maybe we don't need this at all, because setting a domain of MongoDB_ListPosts is good enough?
module.exports.URI = 'http://magnode.org/transform/HTMLBody_typeMongoCursorPosts';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoCursorPosts', 'type:MongoDB_ListPosts']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyPosts']
	, 'rdfs:seeAlso':
		{ id: 'http://magnode.org/transform/MongoCursorPosts_typeMongoDB_List'
		, a: ['view:ModuleTransform', 'view:Transform', 'view:ViewTransform']
		, 'view:module': "magnode/transform.MongoCursor_typeMongoDB_List"
		, 'view:domain': {$list:['type:MongoDB_ListPosts']}
		, 'view:range': 'type:MongoCursorPosts'
		}
	};
