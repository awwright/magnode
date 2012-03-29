module.exports = function(authorizers){
	this.authorizers = authorizers;
}
module.exports.prototype.test = function(user, actions, resources, callback){
	var remaining = this.authorizers.length;
	for(var i=0; i<this.authorizers.length; i++){
		this.authorizers[i].test(user, actions, resources, function(success){
			console.log("Authorize "+i+": "+success);
			if(!remaining) return;
			remaining--;
			if(success) callback(true);
			else if(remaining===0) callback(false);
		});
	}
}
