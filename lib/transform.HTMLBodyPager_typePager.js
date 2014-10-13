var url=require('url');
var escapeHTML=require('./htmlutils').escapeHTML;
var escapeHTMLAttr=require('./htmlutils').escapeHTMLAttr;
var relativeURI=require('./relativeuri');

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function(db, transform, input, render, callback){
	var outputType = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object.toString();});
	var pager = input['http://magnode.org/Pager'];

	var action = url.parse(input.request.url, true);
	var currentPage = pager.page || Math.floor(pager.offset/pager.limit) || 0;
	var pageCount = Math.ceil(pager.resultCount/pager.limit);
	var path = action.pathname;
	var parameters = '&limit='+pager.limit;
	var result = '';

	// Render nothing if this is unnecessary
	if(pager.singlePage!==true && pageCount<=1){
		var output = {};
		for(var j=0;j<outputType.length;j++) output[outputType[j]] = result;
		callback(null, output);
		return;
	}

	function getOffsetURI(variant, offset){
		var alternate = Object.create(variant);
		alternate.pager = alternate.pager && Object.create(alternate.pager) || {};
		alternate.pager.offset = offset;
		return relativeURI(input.rdf, alternate.toURI());
	}

	result += '<div id="paginator"><div class="pagination">';
	// FIXME use padding instead of nonbreaking spaces
	if(currentPage<=0) result += '<span class="disabled">&lt;&lt;</span>&#xA0;&#xA0;';
	else result += '<a rel="prev" href="'+escapeHTMLAttr(getOffsetURI(input.variant, (currentPage-1)*pager.limit))+'">&lt;&lt;</a>&#xA0;&#xA0;';
	var displayPages = [0];
	function addPage(v){if(displayPages.indexOf(v)==-1 && v>=0 && v<pageCount) displayPages.push(v);}
	addPage(Math.floor(currentPage/2));
	for(var i=-2; i<=3; i++) addPage(currentPage+i);
	addPage(Math.floor(currentPage+pageCount/2));
	addPage(pageCount-1);
	displayPages.forEach(function(v){if(displayPages.indexOf(v+1)===-1&&displayPages.indexOf(v+2)!==-1) displayPages.push(v+1);});
	displayPages.sort(function(a,b){return a-b;}).forEach(function(i,j){
		if(currentPage==i) result += '<span class="current">'+(i+1)+'</span>';
		else result += '<a href="'+escapeHTMLAttr(getOffsetURI(input.variant, i*pager.limit))+'">'+(i+1)+'</a>';
		if(!(displayPages[j+1]<=i+1)) result += '&#xA0;&#xA0;'; // So undefined causes this to be true
	});
	//for(var i=0; i<pages; i++){
	//	if(currentPage==i) result += '<span class="current">'+(i+1)+'</span>';
	//	else result += '<a href="'+path+'?offset='+(i*pageSize)+escapeHTMLAttr(parameters)+'">'+(i+1)+'</a>';
	//}
	if(currentPage+1>=pageCount) result += '<span class="disabled">&gt;&gt;</span>';
	else result += '<a rel="next" href="'+escapeHTMLAttr(getOffsetURI(input.variant, (currentPage+1)*pager.limit))+'">&gt;&gt;</a>';
	result += '</div></div>';

	var output = {};
	for(var j=0;j<outputType.length;j++){
		output[outputType[j]] = result;
	}
	callback(null, output);
}
module.exports.URI = 'http://magnode.org/transform/HTMLBodyPager_typePager';
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform']
	, 'view:domain': {$list: ['type:Pager']}
	, 'view:range': 'type:HTMLBodyPager'
	}
