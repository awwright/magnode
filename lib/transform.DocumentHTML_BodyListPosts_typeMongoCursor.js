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
		if(!post) return cursor.count(function(err, count){ finishedPosts(null, renderedPosts, count); });

		// Lets assume the existance of post.subject and post.type
		var targetType = 'http://magnode.org/DocumentHTML_Body';
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

	function finishedPosts(err, renderedPosts, resultCount){
		if(err) callback(err);
		var result = '<div>'+renderedPosts.join("")+'</div>';
		//result += '<p>Showing '+renderedPosts.length+' of '+resultCount+' posts</p>';

		var action = url.parse(input.request.url, true);
		var resultLimit = cursor.pager.limit;
		var currentPage = cursor.pager.page;
		var pageCount = Math.ceil(resultCount/resultLimit);
		var path = action.pathname;
		var parameters = '&limit='+resultLimit;

		result += ('<div id="paginator"><div class="pagination">');
		if(currentPage<=0) result += ('<span class="disabled">&lt;&lt;</span>&nbsp;&nbsp;');
		else result += ('<a href="'+path+'?offset='+((currentPage-1)*resultLimit)+parameters+'">&lt;&lt;</a>&nbsp;&nbsp;');
		var displayPages = [0];
		function addPage(v){if(displayPages.indexOf(v)==-1 && v>=0 && v<pageCount) displayPages.push(v);}
		addPage(Math.floor(currentPage/2));
		for(var i=-2; i<=3; i++) addPage(currentPage+i);
		addPage(Math.floor(currentPage+pageCount/2));
		addPage(pageCount-1);
		displayPages.forEach(function(v){if(displayPages.indexOf(v+1)===-1&&displayPages.indexOf(v+2)!==-1) displayPages.push(v+1);});
		displayPages.sort(function(a,b){return a-b;}).forEach(function(i,j){
			if(currentPage==i) result += ('<span class="current">'+(i+1)+'</span>');
			else result += ('<a href="'+action.pathname+'?offset='+(i*resultLimit)+parameters+'">'+(i+1)+'</a>');
			if(!(displayPages[j+1]<=i+1)) result += ('&nbsp;&nbsp;'); // So undefined causes this to be true
		});
		//for(var i=0; i<pages; i++){
		//	if(currentPage==i) result += ('<span class="current">'+(i+1)+'</span>');
		//	else result += ('<a href="'+path+'?offset='+(i*pageSize)+parameters+'">'+(i+1)+'</a>');
		//}
		if(currentPage+1>=pageCount) result += ('<span class="disabled">&gt;&gt;</span>');
		else result += ('<a href="'+action.pathname+'?offset='+((currentPage+1)*resultLimit)+parameters+'">&gt;&gt;</a>');
		result += ('</div></div>');

		var output = {};
		for(var j=0;j<outputType.length;j++){
			output[outputType[j]] = result;
		}
		callback(output);
	}
}
