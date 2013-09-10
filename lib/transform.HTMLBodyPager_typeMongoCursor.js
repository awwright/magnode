var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var cursor = input['http://magnode.org/MongoCursor'];
	cursor.count(finishedPosts);
	function finishedPosts(err, resultCount){
		if(err) return void callback(err);
		var result = '';

		var action = url.parse(input.request.url, true);
		var resultLimit = cursor.pager.limit;
		var currentPage = cursor.pager.page;
		var pageCount = Math.ceil(resultCount/resultLimit);
		var path = action.pathname;
		var parameters = '&limit='+resultLimit;

		// Render nothing if this is unnecessary
		if(cursor.pager.singlePage!==true && pageCount<=1){
			var output = {};
			for(var j=0;j<outputType.length;j++) output[outputType[j]] = result;
			callback(null, output);
			return;
		}

		result += '<div id="paginator"><div class="pagination">';
		if(currentPage<=0) result += '<span class="disabled">&lt;&lt;</span>&nbsp;&nbsp;';
		else result += '<a href="'+path+'?offset='+((currentPage-1)*resultLimit)+escapeHTMLAttr(parameters)+'">&lt;&lt;</a>&nbsp;&nbsp;';
		var displayPages = [0];
		function addPage(v){if(displayPages.indexOf(v)==-1 && v>=0 && v<pageCount) displayPages.push(v);}
		addPage(Math.floor(currentPage/2));
		for(var i=-2; i<=3; i++) addPage(currentPage+i);
		addPage(Math.floor(currentPage+pageCount/2));
		addPage(pageCount-1);
		displayPages.forEach(function(v){if(displayPages.indexOf(v+1)===-1&&displayPages.indexOf(v+2)!==-1) displayPages.push(v+1);});
		displayPages.sort(function(a,b){return a-b;}).forEach(function(i,j){
			if(currentPage==i) result += '<span class="current">'+(i+1)+'</span>';
			else result += '<a href="'+action.pathname+'?offset='+(i*resultLimit)+escapeHTMLAttr(parameters)+'">'+(i+1)+'</a>';
			if(!(displayPages[j+1]<=i+1)) result += '&nbsp;&nbsp;'; // So undefined causes this to be true
		});
		//for(var i=0; i<pages; i++){
		//	if(currentPage==i) result += '<span class="current">'+(i+1)+'</span>';
		//	else result += '<a href="'+path+'?offset='+(i*pageSize)+escapeHTMLAttr(parameters)+'">'+(i+1)+'</a>';
		//}
		if(currentPage+1>=pageCount) result += '<span class="disabled">&gt;&gt;</span>';
		else result += '<a href="'+action.pathname+'?offset='+((currentPage+1)*resultLimit)+escapeHTMLAttr(parameters)+'">&gt;&gt;</a>';
		result += '</div></div>';

		var output = {};
		for(var j=0;j<outputType.length;j++){
			output[outputType[j]] = result;
		}
		callback(null, output);
	}
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyPager_typeMongoCursorPosts';
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list: ['type:MongoCursor']}
	, 'view:range': 'type:HTMLBodyPager'
	}
