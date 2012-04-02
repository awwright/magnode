/** Always approve GET requests */

module.exports = function(){}

module.exports.prototype.test = function(user, actions, resources, callback){
	if(!Array.isArray(actions)) actions=[actions];
	if(actions.length===1 && actions[0]==="GET") callback(resources&&resources.request&&resources.request.method==="GET");
	else callback(false);
}
