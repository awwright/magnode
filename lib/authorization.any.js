module.exports = function any(authorizers){
	this.authorizers = authorizers;
}
module.exports.prototype.test = function anyTest(user, actions, resources, callback){
	var a = this.authorizers;
	var remaining = 1;
	var audit = new Array(a.length);
	a.forEach(function(aa, i){
		if(remaining===null) return;
		remaining++;
		aa.test(user, actions, resources, function(success, reason){
			if(remaining===null) return;
			audit[i] = {agent:aa.constructor.name, success:success, reason:reason};
			if(success){
				remaining=null;
				callback(true, {any:audit});
			}
			testEnd();
		});
	});
	testEnd();
	function testEnd(){
		if(remaining===null){
			return;
		}else if(--remaining===0){
			remaining=null;
			callback(false, {any:audit});
		}else if(remaining<0){
			throw new Error('Callback returned multiple times');
		}
	}
}
