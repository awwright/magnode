/*
Generate a list of fields that a content type could have.

This information can come from Magnode-specific sources, or gleaned from rdfs:domain and OWL information.

type:ContentType
	a rdfs:Class ;
	view:fields (
		<property1>
		) .
<property1>
	a rdf:Property ;
	rdfs:range <property1range> .
*/
var util=require('util');
var jadeCache;
module.exports = function(db, rdfsClass, callback){
	var propertyCollection = db.filter({subject:rdfsClass,predicate:"http://magnode.org/view/fields"})[0];
	if(propertyCollection) db.getCollection(propertyCollection.object, callback);
	else callback([]);
}
