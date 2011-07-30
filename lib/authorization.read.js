/** Always approve GET requests */

module.exports = function(){}

module.exports.prototype.test = function(user, action, callback){
	callback(action.method=="GET");
}
