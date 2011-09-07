/** Aggregate Database
 *
 * Combines multiple read-only data sources and a read-write master data source.
 */

var fs=require('fs');
var rdf=require('rdf');
var dbMemory=require('./db.memory');

module.exports = function(config, defaultdir, defaultdb){
	var self=this;

	// The three data indexes that can handle any combination of unbound variables + known values in a triple
	// TODO Possibly we want a hash table for non-URI strings, like so: this.literals[HASH("datatype|@langauge value")]=js3 String
	this.clear();

	function r(v){ return (v&&v.resolve&&v.constructor==String)?v.resolve():v; }

	this.instance = {};
	for(g in config){
		// Copy data from the sub-graphs
		for(a in config[g].indexSOP)
			for(b in config[g].indexSOP[a])
				for(c in config[g].indexSOP[a][b])
					this.__proto__.__proto__.add.call(this, config[g].indexSOP[a][b][c]);
		this.instance[g] = config[g];
		console.log("db.aggregate loaded "+g);
	}

	this.flush = function(){
		if(!self.writable) return;
		if(self.format=="lazy"){
			var stage = {date:new Date().toString()};
			if(self.heads) stage.parents=self.heads;
			if(self.stage.d) stage.d=self.stage.d;
			if(self.stage.i) stage.i=self.stage.i;
			var data = JSON.stringify(stage);
			var hash = crypto.createHash(config.hash||"sha1");
			hash.update(data);
			var hash = hash.digest('hex');
			fs.write(self.dbfd, hash+data+"\n", null, null, null, function(err, length){console.log("db.lazy: Wrote "+length+" bytes to file");});
			self.heads = [hash];
			//var bytes=fs.writeSync(self.dbfd, hash+data+"\n"); console.log("db.lazy: Wrote "+bytes+" bytes to file");
		}
		else throw new Error("No write mechanism for the "+self.format+" format");
	}

	this.commit = function(){
		for(g in this.instance){
			if(this.instance[g].commit) this.instance[g].commit();
		}
	}
}
module.exports.prototype = {
	__proto__: new dbMemory,
	add: function(triple, graph){
		var graph = graph||this.defaultdb;
		this.__proto__.__proto__.add.call(this, triple); // Say what?
		if(this.instance[graph]) this.instance[graph].add(triple);
	},
	remove: function(triple, graph){
		this.__proto__.__proto__.remove.call(this, triple);
		if(graph) if(this.instance[graph]) this.instance[graph].remove(triple);
		else for(g in this.instance){
			this.instance[g].remove(triple);
		}
		
	}
}
