module.exports = function any(authorizers){
	authorizers.forEach(function(aa, i){
		if((typeof aa.test)!=='function'){
			throw new Error('Authorizer '+i+' has no method `test`');
		}
	});
	this.authorizers = authorizers;
}
module.exports.prototype.test = function anyTest(user, actions, resources, callback){
	var a = this.authorizers;
	var remaining = 1;
	var audit = new Array(a.length);
	var acceptList = [];
	a.forEach(function(aa, i){
		if(remaining===null) return;
		remaining++;
		aa.test(user, actions, resources, function(success, reason, accepts){
			if(remaining===null) return;
			audit[i] = {agent:aa.constructor.name, success:success, reason:reason};
			if(accepts){
				if(!Array.isArray(accepts)) accepts=[accepts];
				accepts.forEach(function(v){ acceptList.push(accepts); });
			}
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
