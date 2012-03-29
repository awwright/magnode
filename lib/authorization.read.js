/** Always approve GET requests */

module.exports = function(){}

module.exports.prototype.test = function(user, actions, resources, callback){
	if(action&&action.method) callback(action&&action.method=="GET");
	else callback(resources&&resources.request&&resources.request.method=="GET");
}
