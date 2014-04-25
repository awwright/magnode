
var rdf = require('rdf');

module.exports = InformationResource;

function InformationResource(content, mediaType, baseURI){
	this.content = content;
	this.mediaType = mediaType;
	// TODO see if there's a way to make this: this.id and use an @context to set the resource URI
	this['@id'] = baseURI;
}

var context = InformationResource.prototype['@context'] = {};
context.content = 'http://www.w3.org/2011/content#chars';

InformationResource.prototype['@type'] =
	[
		'http://www.w3.org/2011/content#Content',
		'http://www.w3.org/2011/content#ContentAsText'
	];
