var util = require('util');
var url = require('url');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var rdf = require('rdf');

var Render = require('./render');
var escapeHTML = require('./htmlutils').escapeHTML;
var escapeHTMLAttr = require('./htmlutils').escapeHTMLAttr;
var authpbkdf2=require('./authentication.pbkdf2');

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
	if(!configFile) return void cb(null, false);
	fs.stat(configFile, function(err, stat){
		cb(null, stat && stat.isFile());
	});
}, function setup(setupPath, configFile, config, request, cb){
	if(typeof request.reqData=='string') parseData();
	else request.on('end', parseData);
	function parseData(){
		try{
			var formData = require('querystring').parse(request.reqData, /[;&]/g);
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
	}
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
}, function setup(setupPath, configFile, config, request, cb){
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
}, function setup(setupPath, configFile, config, request, cb){
	getDb(config, function(err, db){
		if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
		if(typeof request.reqData=='string') parseData();
		else request.on('end', parseData);
		function parseData(){
			try{
				var formData = require('querystring').parse(request.reqData, /[;&]/g);
				if(!formData.import) return void cb(null);
				var paths = [];
				var bundles = (formData.import instanceof Array)?formData.import:[formData.import];
				bundles = requiredBundles.concat(bundles);
				bundles.forEach(function(v){
					setupBundles[v].files.forEach(function(w){
						var collection = documentGraphParse.graph.match(w, env.createNamedNode(manifestns('collection')), null).map(function(v){return v.object.toString();})[0];
						paths.push( {file: w.toString().replace(/^(file:\/\/)([^/]*)/,''), collection:collection} );
					});
				});
				var parseMongoJSON = require('../setup/lib/parsemongojson');
				parseMongoJSON.importFiles(paths, db, config.siteBase, cb);
			}catch(e){
				return void cb(e);
			}
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
		var nodes = db.collection('nodes');
		nodes.findOne({subject: config.siteSuperuser}, function(err, doc){
			if(err){ cb(err, false); return; }
			if(!doc){ cb(null, false); return; }
			cb(null, true);
		});
	});
}, function setup(setupPath, configFile, config, request, cb){
	var db = getDb(config, function(err, db){
		if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
		if(typeof request.reqData=='string') parseData(db);
		else request.on('end', parseData.bind(null,db));
	});
	function parseData(db){
		try{
			var formData = require('querystring').parse(request.reqData, /[;&]/g);
			if(!formData['accountname']) return void cb(new Error('Account name missing'));
			if(!formData['password.new'] || !formData['password.confirm'] ) return void cb(new Error('Password missing'));
			if(formData['password.new'] !== formData['password.confirm'] ) return void cb(new Error('Passwords do not match'));
			var userAccountName = formData['accountname'];
			var userPassword = formData['password.new'];
			var nodes = db.collection('nodes');
			var shadow = db.collection('shadow');
			var shadowId = new ObjectId;
		}catch(e){
			cb(e);
			return;
		}
		// Remove the old shadow entry, if any
		nodes.findOne({subject: config.siteSuperuser}, function(err, doc){
			if(err) return void cb(err);
			if(doc){
				nodes.update({_id:doc._id}, {$set: {password:shadowId, accountName:userAccountName}}, newPassword);
				console.log('Updating superuser <'+doc.subject+'> at '+doc._id.toString()+':', {accountName:userAccountName});
			}else{
				// Insert new user, if no record exists
				shadowId = new ObjectId;
				var newUser = {_id:new ObjectId, subject:config.siteSuperuser, type:[accountType], accountName:userAccountName, password:shadowId};
				console.log('Inserting superuser:', newUser);
				nodes.save(newUser, newPassword);
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
	}
});

addPage('z', 'Finished', function body(setupPath, configFile, config, request){
	return '<h1>Finish</h1><p>Please re-start the Magnode process and <a href="/login">login to your new website</a>!</p><p class="buttons"><i>Fin.</i></p>';
});

var dbConnections = {};
function getDb(config, cb){
	if(config && (config.dbHost || config.dbName)){
		var dbid = config.dbHost + '+' + config.dbName;
		if(dbConnections[dbid]) return void cb(null, dbConnections[dbid]);
		mongodb.connect(config.dbHost, function(err, db){
			dbConnections[dbid] = db;
			cb(null, db);
		});
		return;
	}
	cb();
}

module.exports = function(route, dbHost, configFile){
	var rand = Math.floor(Math.random()*0xfffff).toString(32).replace(/l/g,'w').replace(/o/g,'x').replace(/u/g,'y');
	var setupPath = '/about:setup/'+rand;
	var base = 'http://localhost/';
	try{
		configFile = path.resolve(process.cwd(), configFile);
		var contents = fs.readFileSync(configFile, 'utf8');
		config = JSON.parse(contents);
		base = config.siteBase || base;
	}catch(e){}

	function response(request, response, matches){
		if(!response){
			// We weren't assigned to handle this one
			return;
		}
		// FIXME make absolute-URL compliant
		var matches = request.url.match(pathRegex);
		if(!matches || matches[1]!==rand){
			response.writeHead(404, {'Content-Type': 'text/plain'});
			response.end('404 Not Found');
			return;
		}

		request.reqData = [];
		request.on('data', function(d){
			request.reqData.push(d.toString());
		});
		request.on('end', function(d){
			request.reqData = request.reqData.join('');
		});

		var config =
			{ dbHost: dbHost||''
			, siteBase: 'http://localhost/'
			, siteSuperuser: 'http://localhost/user/root'
			, siteSecretKey: {file: 'session.key'}
			};
		try{
			var contents = fs.readFileSync(configFile, 'utf8');
			config = JSON.parse(contents);
		}catch(e){}

		var path = (matches[2]||'').split('/');
		var active = path[0];
		var activePage = menuItems[active] || pages[active];
		if(active!=='' && activePage===undefined){
			response.writeHead(404, {'Content-Type': 'text/plain'});
			response.end('404 Not Found');
			return;
		}

		if(request.method=='POST'){
			if(activePage===undefined){
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.end('Not Found');
				return;
			}
			// Process current task
			activePage.setup(setupPath, configFile, config, request, function(err){
				if(err){
					response.statusCode = 500;
					writeResponse(activePage, '<h2>500 Error</h2><pre>'+escapeHTML(err.stack||err.toString())+'</pre>');
					return;
				}
				testNextItem(0);
			});
			// Go to next incomplete task
			function testNextItem(i){
				var v = menuItems[i];
				if(v===undefined) v = pages.z;
				v.test(setupPath, configFile, config, request, function(err, checkmark){
					if(checkmark) return void testNextItem(i+1);
					if(v===activePage){
						response.statusCode = 500;
						writeResponse(v, '<h2>500 Error</h2><p>Failed to verify the '+activePage.title+' setup step. Seek help, this is a bug.</p>');
						return;
					}
					var location = setupPath+'/'+v.id;
					response.writeHead(303, {'Content-Type': 'text/plain', 'Location': location});
					response.end('303 See Other: '+location);
					return;
				});
			}
			return;
		}

		var menuhtml = '';
		function processNextItem(i){
			var v = menuItems[i];
			if(v===undefined){ writeResponse(activePage); return; }
			v.test(setupPath, configFile, config, request, function(err, checkmark){
				if(active==='' && !checkmark){
					active = i;
					activePage = v;
				}
				menuhtml += '<li'+((v===activePage)?' class="active"':'')+'><a href="'+setupPath+'/'+v.id+'">'+v.title+(checkmark?'<span>&#x2713;</span>':'')+'</a></li>';
				processNextItem(i+1);
			});
		}
		processNextItem(0);

		function writeResponse(activePage, body){
			var body = body || activePage.body(setupPath, configFile, config, request);
			if(request.headers.accept && request.headers.accept.indexOf('application/xhtml+xml')>=0){
				response.setHeader("Content-Type", "application/xhtml+xml;charset=utf-8");
			}else{
				response.setHeader("Content-Type", "text/html;charset=utf-8");
			}
			response.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">');
			response.write('<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>');
			response.write('<title>Magnode - Setup</title>');
			response.write('<link rel="stylesheet" href="/setup/static/theme.css" type="text/css" />');
			response.write('</head><body>');
			response.write('<div class="row"><div class="nav">Magnode - Setup</div><div class="main buttons">');
			if(configFile){
				response.write('MAGNODE_CONF = <code>'+escapeHTML(configFile)+'</code>');
			}else{
				response.write('MAGNODE_MONGODB = <code>'+escapeHTML(config.dbHost)+'</code>');
			}
			response.write('</div></div><div class="row"><div class="full">');
			response.write('<ul class="breadcrumb">');
			response.write('<li><a href="'+escapeHTMLAttr(setupPath+'/')+'">Setup</a></li>');
			response.write('<li><a href="'+escapeHTMLAttr(setupPath+'/'+activePage.id)+'">'+escapeHTMLAttr(activePage.title)+'</a></li>');
			response.write('</ul>');
			response.write('</div></div><div class="row"><form action="'+escapeHTMLAttr(setupPath+'/'+activePage.id)+'" method="post" class="main">'+body+'</form><div class="nav"><ul id="menu">'+menuhtml+'</ul></div></div><div class="row"><div class="full"><hr/><p><a href="http://magnode.org/">Magnode.org</a></p></div></div>');
			response.write('</body></html>');
			response.end();
		}
	}
	var pathRegex = new RegExp('^/about:setup/([^/]*)/([^?]*)');
	route.push(pathRegex, response);
	return setupPath+'/';
};
