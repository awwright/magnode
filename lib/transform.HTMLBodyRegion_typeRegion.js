/*
e.g. Transform:HTMLBodyRegion_typeRegion_Footer
	a view:Transform, view:ModuleTransform, view:FormTransform, view:ViewTransform ;
	view:regionType type:HTMLBodyBlock_Footer ;
	view:domain ( "db-mongodb" ) ;
	view:range type:HTMLBodyRegion_Footer .
*/

var shrinkURL = require('./relativeuri');
var escapeHTML = require('./htmlutils').escapeHTML;

module.exports = function(db, transform, input, render, callback){
	var inputIdFirst = db.match(transform,"http://magnode.org/view/domain").map(function(v){return v.object;})[0];
	var inputId = db.getCollection(inputIdFirst);
	if(inputId.length!==1) throw new Error('Transform <'+transform+'> needs exactly one domain argument');
	var outTypes = db.match(transform,"http://magnode.org/view/range").map(function(v){return v.object;});
	var regionId = input[inputId[0]];
	var regionLabel = db.match(transform,"http://magnode.org/view/regionLabel").map(function(v){return v.object;})[0];
	var srcdb = input['db-mongodb-region']||input['db-mongodb'];
	var blocks = [];
	var blockList = [];
	srcdb.findOne({subject:regionId}, function(err, regionDef){
		if(err) blocks.push('<pre style="border:dashed 2px red;">'+escapeHTML(err.stack||err.toString())+'</pre>');
		else if(regionDef) blockList=regionDef.blocks;
		else blocks.push('<pre style="border:dashed 2px red;">Region not defined: '+escapeHTML(regionId+'\n'+require('util').inspect(regionId))+'</pre>');
		nextBlock(0);
	});
	function nextBlock(id){
		var blockId = blockList[id];
		if(!blockId) return haveBlocks();
		srcdb.findOne({subject:blockId}, function(err, node){
			if(err) return callback(err);
			if(!node){ blocks.push('<pre style="border: dotted 2px red;">'+escapeHTML(blockId)+'</pre>'); return nextBlock(id+1); }
			var targetType = 'http://magnode.org/HTMLBodyBlock';
			var resources = Object.create(input.requestenv);
			var transformTypes = [];
			var resourceTypes = Array.isArray(node.type)?node.type:[node.type];
			resourceTypes.forEach(function(v){ resources[v]=node; });
			render.render(targetType, resources, transformTypes, function(err, res){
				if(err) blocks.push('<pre style="border: dotted 2px red;">'+escapeHTML(err.stack||err.toString())+'</pre>');
				else blocks.push(res[targetType]);
				//blocks.push('<pre style="border: dotted 2px green;">'+escapeHTML(require('util').inspect(node))+'</pre>');
				nextBlock(id+1);
			});
		});
	}
	function haveBlocks(){
		classNames = ['region'];
		if(regionLabel) classNames.push('region-'+regionLabel);
		var region = '<div class="'+classNames.join(' ')+'">'+blocks.join('')+'</div>';
		var r = {};
		outTypes.forEach(function(v){ r[v]=region; });
		callback(r);
	}
}
module.exports.URI = "http://magnode.org/transform/HTMLBodyRegion_typeRegion";
module.exports.about =
	{ a: ['view:Transform', 'view:FormTransform', 'view:ViewTransform', 'view:PostTransform']
	};
