
var Defer = require('q');

function Hook(){
	this.hooks = [];
}

Hook.prototype.register = function register(v){
	// TODO assert that 'v' is a function
	this.hooks.push(v);
}

Hook.prototype.emit = function emit(){
	var args = arguments;
	var self = this;
	var ret = Defer.defer();
	// Iterate through and call hooks
	// If they return a defered event, wait for that to finish, then collect its output.
	var results = [];
	var waitingCount = this.hooks.length;
	/** Parallel query */
	// There's an `all` convienence function for this in Deferred/Promises/Q, but we'll be
	// implementing more complex logic e.g. if X returns then don't bother executing Y
	this.hooks.forEach(function(hook, i){
		results[i] = undefined;
		var e = hook.apply(self, args);
		if(e && e.then){
			e.then(hookResult);
		}else{
			hookResult(null);
		}
		function hookResult(v){
			results[i] = v;
			if(--waitingCount===0){
				hooksFinished();
			}
		}
	});
	function hooksFinished(){
		ret.resolve(results);
	}
	return ret.promise;
}

module.exports = Hook;
