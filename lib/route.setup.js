var util = require('util');
var url = require('url');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var rdf = require('rdf');
var contenttype = require('contenttype');
var HttpServerResponse = require('http').ServerResponse;

var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var authpbkdf2=require('./authentication.pbkdf2');
var readRequestBody = require('./requestbody').readRequestBody;

var accountType = 'http://magnode.org/OnlineAccount';

function SetupPage(id, title, body, test, setup){
	this.id = id;
	this.title = title;
	this.body = body;
	this.test = test || function(setupPath, configFile, config, request, cb){cb(null, false);}
	this.setup = setup || function(setupPath, configFile, config, request, cb){cb(null);}
}

var menuItems = [];
var pages = {};
function addPage(id, title, body, test, setup){
	var page = new SetupPage(id, title, body, test, setup);
	pages[id] = page;
	menuItems.push(page);
}

addPage('c', 'Configuration file', function body(setupPath, configFile, config, request){
	var siteBase = config.siteBase;
	if(siteBase=='http://localhost/') siteBase = 'http://'+request.headers.host+'/';
	var dbHost = config.dbHost || 'mongodb://localhost/magnode-localhost';
	var secretKey = config.siteSecretKey && config.siteSecretKey.file || '';
	var superUser = config.siteSuperuser.replace(config.siteBase.replace(/\/$/, ''), '');
	var option = config.option||{};
	return '<h1>Write Configuration File</h1><dl>'
		+ '<dt>Configuration file location</dt><dd><code>'+escapeHTML(configFile)+'</code><p>If this is incorrect, then restart this process with the correct --conf value or MAGNODE_CONF enviromnent variable.</p></dd>'
		+ '<dt>MongoDB connection string (e.g. <code>mongodb://username:password@localhost/database</code>)</dt><dd><input type="text" name="dbHost" value="'+escapeHTMLAttr(dbHost)+'" /></dd>'
		+ '<dt>Site base URL</dt><dd><input type="text" name="siteBase" value="'+escapeHTMLAttr(siteBase)+'" /></dd>'
		+ '<dt>Site title</dt><dd><input type="text" name="option.title" value="'+escapeHTMLAttr(option.title||'')+'" /></dd>'
		+ '<dt>Site logo (use an absolute path or URL, leave blank to use site title)</dt><dd><input type="text" name="option.logo" value="'+escapeHTMLAttr(option.logo||'')+'" /></dd>'
		+ '<dt>Secret salt location (relative to config file location, don\'t change this unless you know what you\'re doing)</dt><dd><input type="text" name="siteSecretKey.file" value="'+escapeHTMLAttr(secretKey)+'" /></dd>'
		+ '<dt>Root user resource (relative to site base, don\'t change this unless you know what you\'re doing)</dt><dd><input type="text" name="siteSuperuser" value="'+escapeHTMLAttr(superUser)+'" /></dd>'
		+ '</dl><div class="buttons"><input type="submit" value="Write file" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	if(!configFile) return void cb(null, true);
	fs.stat(configFile, function(err, stat){
		cb(null, stat && stat.isFile());
	});
}, function setup(setupPath, configFile, config, resources, render, formData, cb){
	try{
		config.dbHost = formData.dbHost;
		config.siteBase = formData.siteBase;
		config.siteSuperuser = url.resolve(formData.siteBase, formData.siteSuperuser);
		config.siteSecretKey = formData['siteSecretKey.file']&&{file: formData['siteSecretKey.file']} || undefined;
		var optionList = ['title', 'logo'];
		if(optionList.some(function(n){return formData['option.'+n]})){
			config.option = config.option || {};
			optionList.forEach(function(n){
				if(formData['option.'+n]) config.option[n] = formData['option.'+n];
				else delete config.option[n];
			});
		}
		var data = JSON.stringify(config, null, '\t');
		fs.writeFileSync(configFile, data);
	}catch(e){
		cb(e);
		return;
	}
	cb(null);
});

addPage('k', 'Secret salt', function body(setupPath, configFile, config, request){
	var file = config && config.siteSecretKey && config.siteSecretKey.file;
	if(!file){
		return '<p>Error: Configuration file not setup. <a href="'+setupPath+'/c">Re-configure</a></p>';
	}
	var fileAbs = path.resolve(path.dirname(configFile), file);
	return '<h1>Secret keys</h1>'
		+ '<p>A secret MAC key will be written to <code>'+escapeHTML(fileAbs)+'</code>. This key is used to sign session tokens and must be kept secret. Changing this key will terminate all active user sessions. So keep it out of your document root!</p>'
		+ '<div class="buttons"><a href="'+setupPath+'/c">Re-configure</a><input type="submit" value="Write file" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	// User chooses not to use a secret key file, this is acceptable
	if(config && !config.siteSecretKey) return void cb(null, true);
	var file = config && config.siteSecretKey && config.siteSecretKey.file;
	if(!file) return void cb(null, false);
	var location = path.resolve(path.dirname(configFile), file);
	fs.stat(location, function(err, stat){
		cb(null, stat && stat.isFile());
	});
}, function setup(setupPath, configFile, config, resources, render, formData, cb){
	var file = config && config.siteSecretKey && config.siteSecretKey.file;
	if(!file) return void cb(new Error('Cannot determine location to write to'));
	var fileAbs = path.resolve(path.dirname(configFile), file);
	var bytes = require('crypto').randomBytes(64);
	var mode = parseInt('600',8);
	fs.writeFileSync(fileAbs, bytes);
	fs.chmodSync(fileAbs, mode);
	cb(null);
});

// Load sample data information from manifest
var env = require('rdf').environment;
var documentManifest = fs.readFileSync(__dirname+'/../setup/mongodb/manifest.ttl', 'utf-8');
var documentGraphParse = new rdf.TurtleParser();
var setupBundles = [];
var requiredBundles = [];
function manifestns(v){ return 'http://magnode.org/mongodb-manifest/'.concat(v); }
documentGraphParse.parse(documentManifest, null, 'file://'+__dirname+'/../setup/mongodb/manifest.ttl');
var root = documentGraphParse.graph.match(null, env.createNamedNode(manifestns('bundleCollection')), null).map(function(v){return v.object;})[0];
documentGraphParse.graph.getCollection(root).forEach(function(subject){
	var optLabel = documentGraphParse.graph.match(subject, env.createNamedNode(rdf.rdfsns('label')), null).map(function(v){return v.object})[0];
	var optDefault = documentGraphParse.graph.match(subject, env.createNamedNode(manifestns('default')), null).map(function(v){return v.object})[0].valueOf();
	var optRequired = documentGraphParse.graph.match(subject, env.createNamedNode(manifestns('required')), null).map(function(v){return v.object})[0].valueOf();
	var bundle = setupBundles[optLabel] = {label:optLabel, default:optDefault, required:optRequired, files:[]};
	if(optRequired) requiredBundles.push(bundle.label.toString());
	var files = documentGraphParse.graph.match(subject, env.createNamedNode('http://magnode.org/mongodb-manifest/files'), null);
	files.forEach(function(t){
		bundle.files = documentGraphParse.graph.getCollection(t.object.toString());
	});
});

addPage('d', 'Database initialization', function body(setupPath, configFile, config, request){
	var itemsHTML = '';
	for(var name in setupBundles){
		var d = setupBundles[name];
		// If someone manipulates the UI into disabling required options... let them. It's not *actually* required for everyone, everywhere
		itemsHTML += '<li><label><input type="checkbox" name="import" value="'+escapeHTMLAttr(name)+'"'+(d.default?' checked="1"':'')+(d.required?' disabled="1"':'')+'/> '+escapeHTML(d.label)+'</label></li>';
	}
	return '<h1>MongoDB initialization</h1><p>The specified database appears to be empty. Import the following features into <code>'+escapeHTML(config.dbHost)+'</code>:</p><ul>'+itemsHTML+'</ul><div class="buttons"><a href="'+setupPath+'/c">Re-configure</a><input type="submit" value="Write database" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	getDb(config, function(err, db){
		if(!config || !db) return void cb(null, false);
		db.collections(function(err, arr){
			if(err) return void cb(err, false);
			arr = arr.map(function(v){ return v.collectionName || v; });
			cb(null, arr.indexOf('nodes')>=0);
		});
	});
}, function setup(setupPath, configFile, config, resources, render, formData, cb){
	getDb(config, function(err, db){
		if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
		var pathList = [];
		var resourceList = [];
		try{
			if(!formData.import) return void cb(null);
			var bundles = (formData.import instanceof Array)?formData.import:[formData.import];
			bundles = requiredBundles.concat(bundles);
			bundles.forEach(function(v){
				setupBundles[v].files.forEach(function(w){
					var collections = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('collection')), null).map(function(v){return v.object.toString();});
					collections.forEach(function(collection){
						pathList.push( {file:w.toString().replace(/^(file:\/\/)([^/]*)/,''), collection:collection} );
					});
					var mediaTypes = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('mediaType')), null).map(function(v){return v.object.toString();});
					mediaTypes.forEach(function(mt){
						resourceList.push( {file:w.toString().replace(/^(file:\/\/)([^/]*)/,''), media:mt} );
					});
				});
			});
		}catch(e){
			return void cb(e);
		}
		// First insert documents into the database that have a marked "collection"
		// There shouldn't be too many of these, only what's necessary for bootstrapping
		var parseMongoJSON = require('../setup/lib/parsemongojson');
		parseMongoJSON.importFiles(pathList, db, config.siteBase, function(e){
			if(e) cb(e);
			else importResource(0);
		});
		// Then insert the resources with a media type by calling the PUT handler
		// This will ensure that the indexing triggers get activated
		function importResource(i){
			var importData = resourceList[i];
			if(!importData) return void finished();
			var parsedData = parseMongoJSON.parseMongoJSON(fs.readFileSync(importData.file));
			var subject = parsedData.id || parsedData.subject; // FIXME this only really works for a JSON Schema
			var contentTypeProfile = new contenttype.MediaType(importData.media).params['profile'];
			var overwrite = true;
			// We want to fake our own result from a router... So get the prototype of the requestenv, which
			// is the first object in the prototype chain carrying resource-specific data, i.e. the prototype
			// carries only generic resources like the database connection handle
			var inputs = Object.create(Object.getPrototypeOf(resources.requestenv));
			var headers = {};
			if(!overwrite) headers['if-none-match'] = '*';
			// We don't actually need this when we're setting `inputs` directly, unless
			// maybe it's used by PUT as an additional consistency check
			//headers['content-type'] = (new contenttype.MediaType('application/json', {profile:contentTypeProfile})).toString();
			var responseBody = '';
			inputs.request = {url:subject, method:'PUT', headers:headers};
			inputs.response = new HttpServerResponse({});
			inputs.response.write = inputs.response.end = function(v){ if(v) responseBody += v.toString(); }
			inputs.resource = subject;
			inputs.variant = {params:{}, resource:subject};
			inputs.requestenv = resources.requestenv; // FIXME this won't do at all!
			inputs.node = parsedData;
			inputs["http://magnode.org/Auth"] = inputs["http://magnode.org/Auth"] || {};
			inputs['http://magnode.org/UserSession'] = resources['http://magnode.org/UserSession']; // needed for HTTPAuth_typeMongoDB_Put formatter
			inputs.authz = new (require('./authorization.read'))(['put'], [contentTypeProfile]); // Authorize all actions for this request
			inputs[contentTypeProfile] = parsedData;
			for(var n in inputs) console.log(n);
			var formatTypes = ['http://magnode.org/view/PutTransform'];
			render.render('http://magnode.org/HTTPResponse', inputs, formatTypes, processResponse);
			function processResponse(err, put){
				var status = put && put['http://magnode.org/HTTPResponse'];
				console.log(importData, status);
				if(err || !status){
					throw new Error('No status returned or error: '+err); // FIXME
				}else if(status>=400){
					console.error(status);
					console.error(responseBody);
					throw new Error('Problem submitting document');
				}else{
					// Take us to the canonical URL for this resource, if updated
					var location = put.response.getHeader('Location');
				}
				importResource(i+1);
			}
		}
		function finished(){
			cb();
		}
	});
});


addPage('u', 'Root user', function body(setupPath, configFile, config, request){
	return '<h1>Create root user</h1><p>The root user by default has complete permissions to do anything.</p><dl>'
		+ '<dt>Root account</dt><dd>'+escapeHTML(config.siteSuperuser)+'</dd>'
		+ '<dt>Root account name</dt><dd><input type="text" name="accountname" value="root" /></dd>'
		+ '<dt>Set password</dt><dd><div><input type="password" name="password.new" value="" class="field-password-a" /><small>Enter a new password</small></div><div><input type="password" name="password.confirm" value="" class="field-password-b" /><small>Confirm new password</small></div></dd>'
		+ '</dl><div class="buttons"><a href="'+setupPath+'/c">Re-configure</a><input type="submit" value="Create/modify user" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	getDb(config, function(err, db){
		if(!config || !db) return void cb(null, false);
		var user = db.collection('user');
		user.findOne({subject: config.siteSuperuser}, function(err, doc){
			if(err){ cb(err, false); return; }
			if(!doc){ cb(null, false); return; }
			cb(null, true);
		});
	});
}, function setup(setupPath, configFile, config, resources, render, formData, cb){
	var db = getDb(config, function(err, db){
		if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
		try{
			if(!formData['accountname']) return void cb(new Error('Account name missing'));
			if(!formData['password.new'] || !formData['password.confirm'] ) return void cb(new Error('Password missing'));
			if(formData['password.new'] !== formData['password.confirm'] ) return void cb(new Error('Passwords do not match'));
			var userAccountName = formData['accountname'];
			var userPassword = formData['password.new'];
			var user = db.collection('user');
			var shadow = db.collection('shadow');
			var shadowId = new ObjectId;
		}catch(e){
			cb(e);
			return;
		}
		// Remove the old shadow entry, if any
		user.findOne({subject: config.siteSuperuser}, function(err, doc){
			if(err) return void cb(err);
			if(doc){
				user.update({_id:doc._id}, {$set: {password:shadowId, accountName:userAccountName}}, newPassword);
				console.log('Updating superuser <'+doc.subject+'> at '+doc._id.toString()+':', {accountName:userAccountName});
			}else{
				// Insert new user, if no record exists
				shadowId = new ObjectId;
				var newUser = {_id:new ObjectId, subject:config.siteSuperuser, type:[accountType], accountName:userAccountName, password:shadowId};
				console.log('Inserting superuser:', newUser);
				user.save(newUser, newPassword);
			}
		});
		function newPassword(err){
			if(err) return void cb(err);
			authpbkdf2.generateRecord({password:userPassword}, function(record){
				record._id = shadowId;
				console.log('Write shadow:', record);
				shadow.save(record, cb);
			});
		}
	});
});

addPage('z', 'Finished', function body(setupPath, configFile, config, request){
	return '<h1>Finish</h1><p>Please re-start the Magnode process and <a href="/login">login to your new website</a>!</p><p class="buttons"><i>Fin.</i></p>';
});

addPage('site/', 'Multisite setup', function body(setupPath, configFile, config, request){
	var html = '<h1>Sites</h1>';
	html += '<table><thead><tr><th>Namespace</th><th>Title</th></tr></thead><tbody>';
	html += '<tr><td><a href="'+escapeHTMLAttr(setupPath+'/site/default')+'">&#171;default&#187;</a></td><td>Test</td></tr>';
	html += '</tbody></table>';
	return html;
});

var dbConnections = {};
function getDb(config, cb){
	if(config && config.dbHost){
		var dbid = config.dbHost;
		if(dbConnections[dbid]) return void cb(null, dbConnections[dbid]);
		mongodb.connect(config.dbHost, function(err, db){
			dbConnections[dbid] = db;
			cb(null, db);
		});
		return;
	}
	cb();
}

module.exports.routeSetup = routeSetup;

function routeSetup(route, dbHost, configFile){
	var setupPath = '/about:setup';
	var base = 'http://localhost/';
	var pathRegex = new RegExp('^(http://[^/]+)?/about:setup/([^?]*)');
	var config =
		{ dbHost: dbHost||''
		, siteBase: 'http://localhost/'
		, siteSuperuser: 'http://localhost/user/root'
		, siteSecretKey: {file: 'session.key'}
		};

	try{
		var contents = fs.readFileSync(configFile, 'utf8');
		config = JSON.parse(contents);
		base = config.siteBase || base;
	}catch(e){}
	
	var setupOpts = {
			setupPath: setupPath,
			base: base,
			configFile: configFile,
			config: config,
	};

	function resolveFn(resource, callback){
		// FIXME make absolute-URL compliant
		var matches = resource.match(pathRegex);
		if(!matches) return void callback(null);
		var path = (matches[2]||'').split('/');
		var active = matches[2];
		var activePage = menuItems[active] || pages[active];
		var menuhtml = '';

		if(path[0]=='site' && path[1]){
			var base = decodeURIComponent(path[1]=='default'?'':path[1]);
			activePage = pages['site/'];
			getDb(config, function(errmenuhtml, db){
				db.collection('namespace').findOne({base:base}, function(err, doc){
					if(!doc){
						return void callback(null);
					}
					return void processNextItem(0, function(){
						return void callback(null, {'http://magnode.org/Namespace':doc, 'http://magnode.org/Setup':setupOpts, 'http://magnode.org/SetupPageMenu':menuhtml});
					});
				});
			});
			return;
		}else if(path[0]=='site'){
			var ret = {};
			ret['http://magnode.org/SetupPageMenu'] = menuhtml;
			ret['http://magnode.org/SetupPage'] = activePage;
			ret['http://magnode.org/Setup'] = setupOpts;
			ret['http://magnode.org/MongoDBList'] = {
				collection: 'namespace',
				filter: {},
				sort: [ {field:'base', dir:1} ],
				output_type: 'table',
				fields: [
					{ label:'Id', text_content_field:'_id', link_href_rel:'self' },
					{ label:'Remark', text_content_field:'label' },
					{ label:'Base', text_content_field:'base' },
				],
				pager: {limit: 10},
				schema: {
					links: [ {rel:'self', href:matches[1]+'/about:setup/site/{base}'} ]
				}
			};
			return void callback(null, ret);
		}

		processNextItem(0, writeResponse);
		function processNextItem(i, cb){
			var v = menuItems[i];
			if(v===undefined){ cb(); return; }
			v.test(setupPath, configFile, config, {}, function(err, checkmark){
				if(active==='' && !checkmark){
					active = i;
					activePage = v;
				}
				menuhtml += '<li'+((v===activePage)?' class="active"':'')+'><a href="'+setupPath+'/'+v.id+'">'+v.title+(checkmark?'<span class="checkmark">&#x2713;</span>':'')+'</a></li>';
				processNextItem(i+1, cb);
			});
		}

		function writeResponse(){
			if(activePage){
				return void callback(null, {'http://magnode.org/SetupPage':activePage, 'http://magnode.org/Setup':setupOpts, 'http://magnode.org/SetupPageMenu':menuhtml});
			}else{
				return void callback(null);
			}
		}
	}

	route.push(resolveFn);
	return setupPath+'/';
};


function renderPage(fndb, tid, resources, render, callback){
	var request = resources.request;
	var response = resources.response;
	var setupPath = '/about:setup';
	var config = resources['http://magnode.org/Setup'].config;
	var configFile = resources['http://magnode.org/Setup'].configFile;
	var activePage = resources['http://magnode.org/SetupPage'];
	var menuhtml = resources['http://magnode.org/SetupPageMenu'];

	var body = body || activePage.body(setupPath, configFile, config, request);
	var breadcrumbhtml = '';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/')+'">Setup</a></li>';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/'+activePage.id)+'">'+escapeHTMLAttr(activePage.title)+'</a></li>';
	var bodyhtml = '<form action="'+escapeHTMLAttr(setupPath+'/'+activePage.id)+'" method="post" class="main">'+body+'</form>';
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, bodyhtml);
	callback(null, {
		'http://magnode.org/HTTPResponse':response.statusCode,
		'media:application/xhtml+xml;charset=utf-8':''
	});
}
renderPage.about = {
	id: 'http://magnode.org/transforms/HTTP_typeSetupPage',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/SetupPage'],
	range: ['http://magnode.org/HTTPResponse', 'media:application/xhtml+xml;charset=utf-8'],
};

function renderHTMLBody(fndb, tid, resources, render, callback){
	var request = resources.request;
	var response = resources.response;
	var setupPath = '/about:setup';
	var bodyhtml = resources['http://magnode.org/HTMLBody'];
	var config = resources['http://magnode.org/Setup'].config;
	var configFile = resources['http://magnode.org/Setup'].configFile;
	var activePage = resources['http://magnode.org/SetupPage'];
	var menuhtml = resources['http://magnode.org/SetupPageMenu'];

	var breadcrumbhtml = '';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/')+'">Setup</a></li>';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/'+activePage.id)+'">'+escapeHTMLAttr(activePage.title)+'</a></li>';
	bodyhtml = '<div class="main">'+bodyhtml+'</div>';
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, bodyhtml);
	callback(null, {'http://magnode.org/HTTPResponse':response.statusCode});
}
renderHTMLBody.about = {
	id: 'http://magnode.org/transforms/HTTP_typeHTMLBody_Setup',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/HTMLBody', 'http://magnode.org/SetupPage'],
	range: ['http://magnode.org/HTTPResponse', 'media:application/xhtml+xml;charset=utf-8'],
	nice: -1
};


function renderScript(fndb, tid, resources, render, callback){
	var request = resources.request;
	var response = resources.response;
	var setupPath = '/about:setup';
	var config = resources['http://magnode.org/Setup'].config;
	var configFile = resources['http://magnode.org/Setup'].configFile;
	var activePage = resources['http://magnode.org/SetupPage'];
	var menuhtml = resources['http://magnode.org/SetupPageMenu'];

	// Process current task
	console.log('Execute script: '+activePage.title);
	readRequestBody(request, 1e6, parseData);
	function parseData(err, body){
		var formData = require('querystring').parse(body, /[;&]/g);
		activePage.setup(setupPath, configFile, config, resources, render, formData, function(err){
			if(err){
				response.statusCode = 500;
				var breadcrumbhtml = '<li>Setup</li><li>Processing error</li>';
				var menuhtml = '';
				var bodyhtml = '<h2>500 Error</h2><pre>'+escapeHTML(err.stack||err.toString())+'</pre>';
				writeSetupPage(request, response, setupPath, config, configFile, 'Error', breadcrumbhtml, menuhtml, bodyhtml);
				callback(null, {'http://magnode.org/HTTPResponse':response.statusCode});
				return;
			}
			testNextItem(0);
		});
	}
	// Go to next incomplete task
	function testNextItem(i){
		var v = menuItems[i];
		if(v===undefined) v = pages.z;
		v.test(setupPath, configFile, config, request, function(err, checkmark){
			if(checkmark) return void testNextItem(i+1);
			if(v===activePage){
				response.statusCode = 500;
				var breadcrumbhtml = '<li>Setup</li><li>Processing error</li>';
				var menuhtml = '';
				var bodyhtml = '<h2>500 Error</h2><p>Failed to verify the '+activePage.title+' setup step. Seek help, this is a bug.</p>';
				writeSetupPage(request, response, setupPath, config, configFile, 'Error', breadcrumbhtml, menuhtml, bodyhtml);
				return;
			}
			var location = setupPath+'/'+v.id;
			response.writeHead(303, {'Content-Type': 'text/plain', 'Location': location});
			response.end('303 See Other: '+location);
			callback(null, {'http://magnode.org/HTTPResponse':response.statusCode});
			return;
		});
	}
}
renderScript.about = {
	id: 'http://magnode.org/transforms/HTTP_typeSetupPage_Post',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/SetupPage'],
	range: ['http://magnode.org/HTTPResponse'],
};

function renderNamespace(fndb, tid, resources, render, callback){
	var request = resources.request;
	var response = resources.response;
	var setupPath = '/about:setup';
	var config = resources['http://magnode.org/Setup'].config;
	var configFile = resources['http://magnode.org/Setup'].configFile;
	var activeNamespace = resources['http://magnode.org/Namespace'];
	var menuhtml = resources['http://magnode.org/SetupPageMenu'];
	var breadcrumbhtml = '';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/')+'">Setup</a></li>';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/site/')+'">Multisite setup</a></li>';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/site/default')+'">Namespace <code>'+escapeHTMLAttr(activeNamespace.base)+'</code></a></li>';
	var html = '';
	html += '<form action="?edit.fn" method="post" class="main">';
	html += '<h1>Namespace: '+escapeHTML(activeNamespace.base)+'</h1>';
	html += '<dl>';
	html += '<dt>Base Namespace</dt>';
	html += '<dd><input type="text" name="base" value="'+escapeHTMLAttr(activeNamespace.base)+'"/></dd>';
	html += '<dt>Options</dt>';
	html += '<dd><textarea>';
	html += escapeHTML(JSON.stringify(activeNamespace.option));
	html += '</textarea></dd>';
	html += '<dt>Required/Enabled Renders</dt>';
	html += '<dd><textarea name="render">';
	var render = activeNamespace.render || [];
	render.forEach(function(v){
		html += escapeHTML(v)+'\n';
	});
	html += '</textarea></dd>';
	html += '<div class="buttons"><input type="submit" value="Save" /></div>';
	html += '</dl></form>';
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, html);
	callback(null, {'http://magnode.org/HTTPResponse':response.statusCode});
}
renderNamespace.about = {
	id: 'http://magnode.org/transforms/HTTP_typeNamespace',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace'],
	range: ['http://magnode.org/HTTPResponse', 'media:application/xhtml+xml;charset=utf-8'],
};

function writeSetupPage(request, response, setupPath, config, configFile, title, breadcrumb, menuhtml, bodyhtml){
	if(request.headers.accept && request.headers.accept.indexOf('application/xhtml+xml')>=0){
		response.setHeader("Content-Type", "application/xhtml+xml;charset=utf-8");
	}else{
		response.setHeader("Content-Type", "text/html;charset=utf-8");
	}
	response.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">');
	response.write('<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>');
	response.write('<title>Magnode - Setup</title>');
	response.write('<link rel="stylesheet" href="/about:setup/static/theme.css" type="text/css" />');
	response.write('</head><body>');
	response.write('<div class="row"><div class="nav">Magnode - Setup</div><div class="main buttons">');
	if(configFile){
		response.write('MAGNODE_CONF = <code>'+escapeHTML(configFile)+'</code>');
	}else{
		response.write('MAGNODE_MONGODB = <code>'+escapeHTML(config.dbHost)+'</code>');
	}
	response.write('</div></div>');
	response.write('<div class="row"><div class="full"><ul class="breadcrumb">');
	response.write(breadcrumb);
	response.write('</ul></div></div>');
	response.write('<div class="row">');
	response.write(bodyhtml);
	response.write('<div class="nav"><ul id="menu">'+menuhtml+'</ul></div>');
	response.write('</div>');
	response.write('<div class="row"><div class="full"><hr/><p><a href="http://magnode.org/">Magnode.org</a></p></div></div>');
	response.write('</body></html>');
	response.end();
}

function renderNamespaceRange(fndb, tid, resources, render, callback){
	var nsdisp = resources['http://magnode.org/NamespaceDisplay'];
	var ns = {};
	for(var n in nsdisp){
		ns[n] = nsdisp[n];
	}
	var base = ns.base = nsdisp.base || 'http://';
	ns.basez = base.substring(0, base.length-1) + String.fromCharCode(base.charCodeAt(base.base.length-1)+1);
	callback(null, {'http://magnode.org/Namespace':ns});
}
renderNamespaceRange.about = {
	id: 'http://magnode.org/transforms/Namespace_typeNamespaceDisplay',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/PutTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/NamespaceDisplay'],
	range: ['http://magnode.org/Namespace'],
};

// bind() to create a fresh Function object
var storeNamespace = require('./transform.HTTPAuto_typeMongoDB_Put').bind();
storeNamespace.about = {
	type: ['http://magnode.org/transforms/Transform', 'http://magnode.org/transforms/PutTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace', 'http://magnode.org/UserSession'],
	range: 'http://magnode.org/HTTPResponse',
	nice: 1,
};

var storeNamespacePost = require('./transform.HTTPAuto_typeFormData_Post').bind();
storeNamespacePost.about = {
	type: ['http://magnode.org/transforms/Transform', 'http://magnode.org/transforms/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace', 'http://magnode.org/UserSession'],
	range: ['http://magnode.org/HTTPResponse', 'http://magnode.org/HTTPResponse_PutFn'],
	nice: 0,
};

module.exports.formatters = [
	renderPage,
	renderHTMLBody,
	renderNamespace,
	renderScript,
	renderNamespaceRange,
	storeNamespace,
 ];
