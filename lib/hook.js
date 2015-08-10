
var Defer = require('q');

function Hook(){
	this.hooks = [];
	this.default = function(){
		return new Array(this.hooks.length);
	};
	this.reduce = function(prev, cur, i){
		var n = prev.slice();
		n[i] = cur;
		return n;
	};
}

Hook.concat = function(prev, cur){
	return prev.concat(cur||[]);
}

Hook.prototype.register = function register(v){
	if(typeof v != 'function'){
		throw new Error('Argument to Hook#register must be a function');
	}
	this.hooks.push(v);
}

Hook.prototype.emit = function emit(){
	var args = arguments;
	var self = this;
	var ret = Defer.defer();
	// Iterate through and call hooks
	// If they return a defered event, wait for that to finish, then collect its output.
	var results = this.default();
	var waitingCount = this.hooks.length+1;
	/** Parallel query */
	// There's an `all` convienence function for this in Deferred/Promises/Q, but we'll be
	// implementing more complex logic e.g. if X returns then don't bother executing Y
	this.hooks.forEach(function(hook, i){
		var e = hook.apply(self, args);
		if(e && e.then){
			e.then(hookResult).done();
		}else{
			hookResult(null);
		}
		function hookResult(v){
			results = self.reduce(results, v, i);
			if(--waitingCount===0) hooksFinished();
		}
	});
	function hooksFinished(){
		ret.resolve(results);
	}
	// Handle case of zero hooks defined
	if(--waitingCount===0) hooksFinished();
	return ret.promise;
}

module.exports = Hook;
