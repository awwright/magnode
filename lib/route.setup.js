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
var queryVariant = require('./queryvariant').parseUriVariants;
var relativeURI = require('./relativeuri');

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
	var siteBase = config.siteBase || 'http://localhost/';
	if(siteBase=='http://localhost/') siteBase = 'http://'+request.headers.host+'/';
	var dbHost = config.dbHost || 'mongodb://localhost/magnode-localhost';
	var secretKey = config.siteSecretKey && config.siteSecretKey.file || '';
	var superUser = config.siteSuperuser.replace(siteBase.replace(/\/$/, ''), '');
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
		if(!stat || !stat.isFile()) return void cb(null, false);
		// Verify that required options exist
		if(!config || !config.siteBase) return void cb(null, false);
		cb(null, true);
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
		// Ensure that a MongoDBJSONSchema transform is handled correctly
		// In case it wasn't imported on startup (because it didn't exist yet)
		if(!render.renders['http://magnode.org/MongoDBJSONSchema_Transform_Put']){
			render.renders['http://magnode.org/MongoDBJSONSchema_Transform_Put'] = require('./transform.HTTPAuto_typeMongoDB_Put');
			var schemaPutTransformer =
				{ $context: {view:'http://magnode.org/view/'}
				, a: ['http://magnode.org/view/Transform', 'http://magnode.org/view/PutTransform', 'http://magnode.org/view/DeleteTransform']
				, view$domain: {$list: ['http://magnode.org/MongoDBJSONSchema', 'http://magnode.org/UserSession']}
				, view$range: 'http://magnode.org/HTTPResponse'
				, view$nice: 1
				};
			rdf.parse(schemaPutTransformer, 'http://magnode.org/MongoDBJSONSchema_Transform_Put').graphify().forEach(function(t){ render.db.add(t); });
		}
		// Insert the data into this database
		var pathList = [];
		var resourceList = [];
		if(!formData.import) return void cb(null);
		try{
			var bundles = (formData.import instanceof Array)?formData.import:[formData.import];
			bundles = requiredBundles.concat(bundles);
			bundles.forEach(function(v){
				if(!setupBundles[v]) throw new Error('Bundle not found: '+JSON.stringify(v));
				setupBundles[v].files.forEach(function(w){
					var documentPath = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('document')), null).map(function(v){return v.object.toString();})[0];
					var collections = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('collection')), null).map(function(v){return v.object.toString();});
					collections.forEach(function(collection){
						pathList.push( {file:documentPath.toString().replace(/^(file:\/\/)([^/]*)/,''), collection:collection} );
					});
					var mediaTypes = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('mediaType')), null).map(function(v){return v.object.toString();});
					var targets = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('target')), null).map(function(v){return v.object.toString();});
					mediaTypes.forEach(function(mt){
						targets.forEach(function(targetNode){
							resourceList.push( {file:documentPath.toString().replace(/^(file:\/\/)([^/]*)/,''), media:mt, target:targetNode.toString().replace(/^http:\/\/localhost\//, config.siteBase)} );
						});
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
			var parsedData = parseMongoJSON.parseMongoJSON(fs.readFileSync(importData.file).toString(), config.siteBase);
			var subject = importData.target || parsedData.id || parsedData.subject;
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
			var formatTypes = ['http://magnode.org/view/PutTransform'];
			render.render('http://magnode.org/HTTPResponse', inputs, formatTypes, processResponse);
			function processResponse(err, put){
				var status = put && put['http://magnode.org/HTTPResponse'];
				if(err || !status){
					throw new Error('No status returned or error: '+err); // FIXME
				}else if(status>=400){
					console.error('Problem submitting document <'+subject+'> ('+status+')');
					console.error(responseBody);
					return void cb(new Error('Problem submitting document'));
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

function routeSetup(dbHost, configFile){
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
		var requiredTypeMap = {
			'edit': ['http://magnode.org/HTMLBody_PutForm', 'http://magnode.org/HTMLBody'],
			'put.fn': ['http://magnode.org/HTTPResponse_PutFn'],
			'delete': ['http://magnode.org/HTMLBody_DeleteForm', 'http://magnode.org/HTMLBody'],
			'delete.fn': ['http://magnode.org/HTTPResponse_DeleteFn'],
		};
		var variant = queryVariant(resource, requiredTypeMap);
		variant.requiredTypes = variant.requiredTypes||{};

		processNextItem(0, writeResponse);
		function processNextItem(i, cb){
			var v = menuItems[i];
			if(v===undefined){ cb(); return; }
			v.test(setupPath, configFile, config, {}, function(err, checkmark){
				if(active==='' && !checkmark){
					active = i;
					activePage = v;
				}
				menuhtml += '<li'+((v===activePage)?' class="active"':'')+'>'
					+ '<a href="'+setupPath+'/'+v.id+'">'+v.title+(checkmark?'<span class="checkmark">&#x2713;</span>':'')+'</a>'
					+ '</li>';
				processNextItem(i+1, cb);
			});
		}

		function writeResponse(){
			menuhtml += '<li'+((active==='namespace')?' class="active"':'')+'>'
				+ '<a href="'+setupPath+'/namespace">Multisite setup</a>'
				+ '</li>';
			if(activePage){
				var ret = {};
				ret['http://magnode.org/SetupPageMenu'] = menuhtml;
				ret['http://magnode.org/Setup'] = setupOpts;
				ret['http://magnode.org/SetupPage'] = activePage;
				return void callback(null, ret);
			}else if(path[0]=='namespace' && 'new' in variant.params){
				var ret = {};
				ret.variant = variant;
				ret.variant.createTarget = queryVariant(variant.toURI(), requiredTypeMap);
				ret.variant.resource = 'http://localhost/about:setup/namespace/'+new ObjectId;
				ret['http://magnode.org/SetupPageMenu'] = menuhtml;
				ret['http://magnode.org/Setup'] = setupOpts;
				ret['http://magnode.org/Namespace'] = {
					base: 'http://',
					label: 'new'
				};
				return void callback(null, ret);
			}else if(path[0]=='namespace' && !path[1]){
				var ret = {};
				ret['http://magnode.org/SetupPageMenu'] = menuhtml;
				ret['http://magnode.org/Setup'] = setupOpts;
				ret['http://magnode.org/NamespaceList'] = {};
				return void callback(null, ret);
			}else{
				return void callback(null);
			}
		}
	}

	function namespace(uri, httpd, resources){
		var iri = new (require('iri').IRI)(uri);
		var pathParts = (iri.path() || '').split('/');
		if(pathParts[1]==='about:setup'){
			var base = iri.resolveReference('/about:setup/').toString();
			return require('q').resolve({
				// the base is... whatever the page was requested with
				base: base,
				// But the 'permalink' to the namespace is http://localhost/about:setup/
				resource: 'http://localhost/about:setup/'+iri.toString().substring(base.length),
				label: 'Setup',
				option: {
					'http://magnode.org/Setup': setupOpts,
					useTransformTypes: ['http://magnode.org/view/Setup'],
				}
			});
		}
	}

	return {
		namespace: namespace,
		route: resolveFn,
		formatters: module.exports.formatters,
		path: setupPath+'/',
	};
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
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, bodyhtml, callback);
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
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, bodyhtml, callback);
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
		var formData = require('querystring').parse(body, '&');
		activePage.setup(setupPath, configFile, config, resources, render, formData, function(err){
			if(err){
				response.statusCode = 500;
				var breadcrumbhtml = '<li>Setup</li><li>Processing error</li>';
				var menuhtml = '';
				var bodyhtml = '<h2>500 Error</h2><pre>'+escapeHTML(err.stack||err.toString())+'</pre>';
				writeSetupPage(request, response, setupPath, config, configFile, 'Error', breadcrumbhtml, menuhtml, bodyhtml, callback);
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
				writeSetupPage(request, response, setupPath, config, configFile, 'Error', breadcrumbhtml, menuhtml, bodyhtml, callback);
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
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/')+'">Multisite setup</a></li>';
	if(activeNamespace.base){
		breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/')+'">Namespace</a></li>';
		breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/'+encodeURIComponent(activeNamespace.base))+'"><code>'+escapeHTMLAttr(activeNamespace.base)+'</code></a></li>';
	}else{
		breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/')+'">Namespace</a></li>';
		breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/default')+'">'+escapeHTMLAttr(activeNamespace.label)+'</a></li>';
	}
	var putFn = Object.create(resources.variant.createTarget || resources.variant);
	putFn.requiredTypes = ['http://magnode.org/HTTPResponse_PutFn'];
	function Option(label, value, current){
		return '<option'+(value?' value="'+escapeHTML(value)+'"':'')+(value==current?' selected="selected"':'')+'>'+escapeHTML(label)+'</option>';
	}
	var html = '';
	html += '<form action="'+escapeHTMLAttr(relativeURI(resources.rdf, resources.request.uri, putFn.toURI()))+'" method="post" class="main">';
	html += '<h1>Namespace: '+escapeHTML(activeNamespace.base)+'</h1>';
	html += '<dl>';
	html += '<dt>Base namespace</dt>';
	html += '<dd><input type="text" name=".base" value="'+escapeHTMLAttr(activeNamespace.base)+'"/></dd>';
	html += '<dt>Label</dt>';
	html += '<dd><input type="text" name=".label" value="'+escapeHTMLAttr(activeNamespace.label||'')+'"/></dd>';
	html += '<dt>Additional listener namespaces</dt>';
	html += '<dd><textarea name=".listen">';
	html += escapeHTML((activeNamespace.listen||[]).join("\n"));
	html += '</textarea></dd>';
	html += '<dt>Match hosts</dt>';
	html += '<dd><textarea name=".host">';
	html += escapeHTML((activeNamespace.host||[]).join("\n"));
	html += '</textarea></dd>';
	html += '<dt>Required/Enabled Renders</dt>';
	html += '<dd><textarea name=".render">';
	html += escapeHTML((activeNamespace.render||[]).join("\n"));
	html += '</textarea></dd>';
	html += '<dt>Default user authentication system</dt>';
	html += '<dd><select name=".auth">';
	html += Option('None/custom', 'none', activeNamespace.auth);
	html += Option('Single-user', 'single', activeNamespace.auth);
	html += Option('Local user account database', 'local', activeNamespace.auth);
	html += Option('Third party OAuth', 'oauth', activeNamespace.auth);
	html += '</select></dd>';
	html += '<dt>Single-user options - Password</dt>';
	html += '<dd><input type="text" name=".auth_single.password" value="'+escapeHTMLAttr(activeNamespace.base)+'"/></dd>';
	html += '<dt>Local user database options - Permitted account creation</dt>';
	html += '<dd><ul>';
	html += '<li><label><input type="checkbox" name=".auth_local.access_anonymous" value="1"/> Anonymous users</label></li>';
	html += '<li><label><input type="checkbox" name=".auth_local.access_registered" value="1"/> Registered users</label></li>';
	html += '<li><label><input type="checkbox" name=".auth_local.access_administrator" value="1"/> Administrators</label></li>';
	html += '</ul></dd>';
	html += '<dt>OAuth Options - OAuth 2 Endpoint</dt>';
	html += '<dd><input type="text" name=".auth_oauth.endpoint" value="'+escapeHTMLAttr(activeNamespace.base)+'"/></dd>';
	html += '<dt>Additional Options (JSON)</dt>';
	html += '<dd><textarea name=".options">';
	html += escapeHTML(JSON.stringify(activeNamespace.option||{}));
	html += '</textarea></dd>';
	html += '<div class="buttons"><input type="submit" value="Save" /></div>';
	html += '</dl>';
	html += '<input type="hidden" name=".base:format" value="Label"/>';
	html += '<input type="hidden" name=".label:format" value="Label"/>';
	html += '<input type="hidden" name=".listen:format" value="Label"/>';
	html += '<input type="hidden" name=".host:format" value="Label"/>';
	html += '<input type="hidden" name=".auth:format" value="Label"/>';
	html += '<input type="hidden" name=":oauth" value="Object"/>';
	html += '<input type="hidden" name=".render:format" value="Label"/>';
	html += '<input type="hidden" name=".options:format" value="JSON"/>';
	html += '<input type="hidden" name=":method" value="PUT"/>';
	html += '<input type="hidden" name=":type" value="http://magnode.org/NamespaceDisplay"/>';
	html += '<input type="hidden" name=":subject" value="'+escapeHTMLAttr(resources.resource)+'"/>';
	html += '<input type="hidden" name=":auth" value="'+escapeHTMLAttr((resources['http://magnode.org/UserSession']||{}).formToken||'anonymous')+'"/>';
	html += '</form>';
	writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, html, callback);
}
renderNamespace.about = {
	id: 'http://magnode.org/transforms/HTTP_typeNamespace',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace'],
	range: ['http://magnode.org/HTTPResponse', 'media:application/xhtml+xml;charset=utf-8'],
};

function renderNamespaceList(fndb, tid, resources, render, callback){
	var request = resources.request;
	var response = resources.response;
	var setupPath = '/about:setup';
	var config = resources['http://magnode.org/Setup'].config;
	var configFile = resources['http://magnode.org/Setup'].configFile;
	var activeNamespace = resources['http://magnode.org/Namespace'];
	var menuhtml = resources['http://magnode.org/SetupPageMenu'];
	var breadcrumbhtml = '';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/')+'">Setup</a></li>';
	breadcrumbhtml += '<li><a href="'+escapeHTMLAttr(setupPath+'/namespace/')+'">Multisite setup</a></li>';
	getDb(config, function(err, db){
		var html = '';
		html += '<div class="main">';
		html += '<h1>Sites</h1>';
		html += '<table><thead><tr><th>Namespace</th><th>Title</th></tr></thead><tbody>';
		db.collection('namespace').find().each(function(err, doc){
			if(err) throw err;
			if(!doc) return void done();
			html += '<tr>';
			html += '<td><a href="'+escapeHTMLAttr(setupPath+'/namespace/'+encodeURIComponent(doc.base||'default'))+'">'+(escapeHTML(doc.base) || '&#171;default&#187;')+'</a></td>';
			html += '<td>'+(doc.label)+'</td>';
			html += '</tr>';
		});
		function done(){
			html += '</tbody></table>';
			html += '<div class="multisite-add"><a href="?new">Create new</a></div>';
			html += '</div>';
			writeSetupPage(request, response, setupPath, config, configFile, '', breadcrumbhtml, menuhtml, html, callback);
		}
	});
}
renderNamespaceList.about = {
	id: 'http://magnode.org/transforms/HTTP_typeNamespaceList',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/NamespaceList'],
	range: ['http://magnode.org/HTTPResponse', 'media:application/xhtml+xml;charset=utf-8'],
};

function writeSetupPage(request, response, setupPath, config, configFile, title, breadcrumb, menuhtml, bodyhtml, callback){
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
	//console.log('Write setup page');
	callback(null, {
		'http://magnode.org/HTTPResponse': response.statusCode,
		'media:application/xhtml+xml;charset=utf-8': ''
	});
}


// Take an end-user object and add the `basez` and `slug` properties computed from it
function renderNamespaceRange(fndb, tid, resources, render, callback){
	var nsdisp = resources['http://magnode.org/NamespaceDisplay'];
	var ns = {};
	for(var n in nsdisp){
		ns[n] = nsdisp[n];
	}
	var base = ns.base = nsdisp.base || '';
	if(base.length){
		ns.basez = base.substring(0, base.length-1) + String.fromCharCode(base.charCodeAt(base.length-1)+1);
	}else{
		ns.basez = '~';
	}
	ns.slug = ns.base || 'default';
	ns.render = (ns.render || '').split(/\n/g).filter(function(v){ return v.length; });
	callback(null, {'http://magnode.org/Namespace':ns});
}
renderNamespaceRange.about = {
	id: 'http://magnode.org/transforms/Namespace_typeNamespaceDisplay',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/GetTransform', 'http://magnode.org/view/PutTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/NamespaceDisplay'],
	range: ['http://magnode.org/Namespace'],
	nice: -1,
};

// bind() to create a fresh Function object
var storeNamespace = require('./transform.HTTPAuto_typeMongoDB_Put').bind();
storeNamespace.about = {
	id: 'http://magnode.org/transforms/HTTPResponse_typeNamespace_Put',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/PutTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace', 'http://magnode.org/UserSession'],
	range: 'http://magnode.org/HTTPResponse',
	nice: 1,
};

var storeNamespaceFn = require('./transform.HTTPAuto_typeFormData_Post').bind();
storeNamespaceFn.about = {
	id: 'http://magnode.org/transforms/HTTPResponse_typeNamespace_PutFn',
	type: ['http://magnode.org/view/Transform', 'http://magnode.org/view/PostTransform', 'http://magnode.org/view/Setup'],
	domain: ['http://magnode.org/Namespace', 'http://magnode.org/UserSession'],
	range: ['http://magnode.org/HTTPResponse', 'http://magnode.org/HTTPResponse_PutFn'],
	nice: 0,
};

module.exports.formatters = [
	renderPage,
	renderHTMLBody,
	renderNamespace,
	renderNamespaceList,
	renderScript,
	renderNamespaceRange,
	storeNamespace,
	storeNamespaceFn,
 ];
