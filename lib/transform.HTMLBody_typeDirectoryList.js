
var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;

// This transform should be called by view when a ModuleTransform calls for this module
module.exports = function HTMLBody_typeMarkdown(db, transform, resources, render, callback){
	var resourcesTypeFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var resourcesTypes = db.getCollection(resourcesTypeFirst);
	var fileList = resources[resourcesTypes[0]];
	var outputTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});

	var result = '<ul>'+fileList.map(function(v){
		return '<li><a href="./'+escapeHTMLAttr(v)+'">'+escapeHTML(v)+'</a></li>';
	}).join('')+'</ul>';

	var output = {};
	outputTypes.forEach(function(v){output[v]=result;});
	//output['HTTP-Content-Type'] = 'application/xhtml+xml';
	callback(null, output);
}
module.exports.URI = "http://magnode.org/transform/HTMLBody_typeDirectoryList";
module.exports.about =
	{ a: ['view:Transform', 'view:GetTransform', 'view:PutFormTransform', 'view:DeleteFormTransform']
	, 'view:domain': {$list:['http://magnode.org/DirectoryList']}
	, 'view:range': ['http://magnode.org/HTMLBody']
	};
