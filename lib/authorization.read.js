/** Always approve certain requests, e.g. GET on a public resource */

module.exports = function read(actions, types){
	this.actions = (actions instanceof Array)?actions:[actions];
	this.types = (types instanceof Array)?types:[types];
}

module.exports.prototype.test = function readTest(user, actions, resources, callback){
	var validActions = this.actions;
	var validTypes = this.types;
	if(!Array.isArray(actions)) actions=[actions];
	// All supplied actions must be permitted
	if(actions.some(function(v){ return validActions.indexOf(v)<0; })) return void callback(false);
	// One of the types must be granted
	// FIXME hasOwnProperty may be too restrictive, but we need
	// to watch out to make sure we don't catch other parents resource's types
	if(validTypes.some(function(v){ return (v in resources); })) return void callback(true);
	// If we don't want to catch a prototype's properties, use:
	//if(validTypes.some(function(v){ return Object.prototype.hasOwnProperty.call(resources,v); })) return void callback(true);
	return void callback(false);
}
