module.exports = function any(authorizers){
	this.authorizers = authorizers;
}
module.exports.prototype.test = function anyTest(user, actions, resources, callback){var a=this.authorizers;
	var remaining = this.authorizers.length;
	for(var i=0; i<this.authorizers.length; i++){
		this.authorizers[i].test(user, actions, resources, function(success){
			//console.log("Authorize "+i+": "+success);
			if(remaining===false) return;
			remaining--;
			if(success){
				callback(true);
				remaining=false;
			}
			testEnd();
		});
	}
	testEnd();
	function testEnd(){
		if(remaining===false) return;
		if(remaining===0){
			remaining=false;
			callback(false);
		}
	}
}
