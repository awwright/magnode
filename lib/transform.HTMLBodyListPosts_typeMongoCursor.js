/*
It's more appropriate to store the corresponding Lists transform definition here
FIXME: Need to fix or supercede Turtle blob detection
... starting the second Transform statement right after the previous one ends is the only way to make it work, appearently :-\
*/
var util=require('util');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var cursor = input['http://magnode.org/MongoCursorPosts'];
	var renderedPosts = [];

	cursor.next(function nextPost(err, post){
		if(err) return finishedPosts(err);
		if(!post) return finishedPosts(null, renderedPosts);

		// Lets assume the existance of post.subject and post.type
		var targetType = 'http://magnode.org/HTMLBody';
		var srcTypes = post.type || [];
		var resources = {subject:post.subject, rdf:input.rdf};
		for(var i=0; i<srcTypes.length; i++) resources[srcTypes[i]] = post;
		var transformTypes = [];
		render.render(targetType, resources, transformTypes, function(err, res){
			if(err) return cb(err);
			var postBody;
			if(res && res[targetType]){
				postBody = res[targetType];
			}else{
				postBody = '<pre class="field-default">'+escapeHTML(util.inspect(node[fieldName]))+'</pre>';
			}
			renderedPosts.push('<div>'+postBody+'</div><hr/>');
			cursor.next(nextPost);
		});
	});

	var result;
	var targetType = 'http://magnode.org/HTMLBodyPager';
	function finishedPosts(err, renderedPosts){
		if(err) return callback(err);
		result = '<div>'+renderedPosts.join("")+'</div>';
		//result += '<p>Showing '+renderedPosts.length+' of '+resultCount+' posts</p>';

		var resources = {'http://magnode.org/MongoCursor': cursor};
		for(var n in input) if(!Object.hasOwnProperty.call(resources, n)) resources[n] = input[n];
		transformTypes = [];
		render.render(targetType, resources, transformTypes, haveRenderedPager);
	}
	function haveRenderedPager(err, resources){
		if(err) throw err;
		result += resources[targetType];
		var output = {};
		for(var j=0;j<outputType.length;j++){
			output[outputType[j]] = result;
		}
		callback(null, output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBody_typeMongoCursorPosts';
module.exports.about =
	{ a: ['view:Transform', 'view:ViewTransform']
	, 'view:domain': {$list:['type:MongoCursorPosts']}
	, 'view:range': ['type:HTMLBody', 'type:HTMLBodyPosts']
	, 'rdfs:seeAlso':
		{ id: 'http://magnode.org/transform/MongoCursorPosts_typeMongoDB_List'
		, a: ['view:ModuleTransform', 'view:Transform', 'view:ViewTransform']
		, 'view:module': "magnode/transform.MongoCursor_typeMongoDB_List"
		, 'view:domain': {$list:['type:MongoDB_ListPosts']}
		, 'view:range': 'type:MongoCursorPosts'
		}
	};
