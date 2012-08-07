/*
Transform:MongoCursorPosts_typeMongoDB_List
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.MongoCursor_typeMongoDB_List" ;
	view:domain type:MongoDB_ListPosts ;
	view:range type:MongoCursorPosts . Transform:DocumentHTML_Body_typeMongoCursorPosts
	a view:ModuleTransform, view:Transform, view:ViewTransform ;
	view:module "magnode/transform.DocumentHTML_BodyListPosts_typeMongoCursor" ;
	view:domain type:MongoCursorPosts ;
	view:range type:DocumentHTML_Body .
*/
/*
It's more appropriate to store the corresponding Lists transform definition here
FIXME: Need to fix or supercede Turtle blob detection
... starting the second Transform statement right after the previous one ends is the only way to make it work, appearently :-\
*/
var util=require('util');
var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.filter({subject:transform,predicate:"http://magnode.org/view/range"}).map(function(v){return v.object;});
	var cursor = input['http://magnode.org/MongoCursorPosts'];
	var renderedPosts = [];

	cursor.next(function nextPost(err, post){
		if(err) return finishedPosts(err);
		if(!post) return finishedPosts(null, renderedPosts);

		// Lets assume the existance of post.subject and post.type
		var targetType = 'http://magnode.org/DocumentHTML_Body';
		var srcTypes = post.type || [];
		var input = {subject: post.subject};
		for(var i=0; i<srcTypes.length; i++) input[srcTypes[i]] = post;
		var transformTypes = [];
		render.render(targetType, input, transformTypes, function(err, res){
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

	function finishedPosts(err, renderedPosts){
		if(err) callback(err);
		var result = '<div>'+renderedPosts.join("")+'</div><p>Showing '+renderedPosts.length+' posts</p>';
		var output = {};
		for(var j=0;j<outputType.length;j++){
			output[outputType[j]] = result;
		}
		callback(output);
	}
}
