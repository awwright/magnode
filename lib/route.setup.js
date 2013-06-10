var util = require('util');
var url = require('url');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var mongodb = require('mongolian');

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
	var secretKey = config.siteSecretKey && config.siteSecretKey.file || '';
	var superUser = config.siteSuperuser.replace(config.siteBase.replace(/\/$/, ''), '');
	var option = config.option||{};
	return '<h1>Write Configuration File</h1><dl>'
		+ '<dt>Configuration file location</dt><dd><code>'+escapeHTML(configFile)+'</code><p>If this is incorrect, then restart this process with the correct --conf value or MAGNODE_CONF enviromnent variable.</p></dd><dt>MongoDB connection string (e.g. <code>mongodb://username:password@localhost/database</code>)</dt><dd><input type="text" name="dbHost" value="'+escapeHTMLAttr(config.dbHost)+'" /></dd>'
		+ '<dt>Site base URL</dt><dd><input type="text" name="siteBase" value="'+escapeHTMLAttr(siteBase)+'" /></dd>'
		+ '<dt>Site title</dt><dd><input type="text" name="option.title" value="'+escapeHTMLAttr(option.title||'')+'" /></dd>'
		+ '<dt>Site logo (use an absolute path or URL, leave blank to use site title)</dt><dd><input type="text" name="option.logo" value="'+escapeHTMLAttr(option.logo||'')+'" /></dd>'
		+ '<dt>Secret salt location (relative to config file location, don\'t change this unless you know what you\'re doing)</dt><dd><input type="text" name="siteSecretKey.file" value="'+escapeHTMLAttr(secretKey)+'" /></dd>'
		+ '<dt>Root user resource (relative to site base, don\'t change this unless you know what you\'re doing)</dt><dd><input type="text" name="siteSuperuser" value="'+escapeHTMLAttr(superUser)+'" /></dd>'
		+ '</dl><div class="buttons"><input type="submit" value="Write file" /></div>';
}, function test(setupPath, configFile, config, request, cb){
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

addPage('d', 'Database initialization', function body(setupPath, configFile, config, request){
	var documents = ['base', 'List', 'OnlineAccount', 'Usergroup', 'Taxonomy', 'PublishOption', 'Page', 'Post', 'frontpage', 'DocumentRegion', 'LinkMenu', 'ThemeData', 'intro'];
	var documentItems = documents.map(function(v){ return '<li><label><input type="checkbox" name="import" value="'+escapeHTMLAttr(v)+'" checked="checked"/> '+escapeHTML(v)+'.json</label></li>'; }).join('');
	return '<h1>MongoDB initialization</h1><p>The specified database appears to be empty. The folowing documents from <code>setup/data/</code> will be imported into <code>'+escapeHTML(config.dbHost)+'</code>:</p><ul>'+documentItems+'</ul><div class="buttons"><a href="'+setupPath+'/c">Re-configure</a><input type="submit" value="Write database" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	var db = getDb(config);
	if(!config || !db) return void cb(null, false);
	db.collectionNames(function(err, arr){
		if(err) return void cb(err, false);
		cb(null, arr.indexOf('nodes')>=0);
	});
}, function setup(setupPath, configFile, config, request, cb){
	var db = getDb(config);
	if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
	if(typeof request.reqData=='string') parseData();
	else request.on('end', parseData);
	function parseData(){
		try{
			var formData = require('querystring').parse(request.reqData, /[;&]/g);
			if(!formData.import) return void cb(null);
			var files = (formData.import instanceof Array)?formData.import:[formData.import];
			var paths = files.map(function(v){return path.resolve(__dirname+'/../setup/data', 'mongodb-'+v.replace(/\.\./g,'')+'.json');});
			var parseMongoJSON = require('../setup/lib/parsemongojson');
			parseMongoJSON.importFiles(paths, db, config.siteBase, cb);
		}catch(e){
			return void cb(e);
		}
	}
});


addPage('u', 'Root user', function body(setupPath, configFile, config, request){
	return '<h1>Create root user</h1><p>The root user by default has complete permissions to do anything.</p><dl><dt>Root account</dt><dd>'+escapeHTML(config.siteSuperuser)+'</dd><dt>Root account name</dt><dd><input type="text" name="accountname" value="root" /></dd><dt>Set password</dt><dd><div><input type="password" name="password.new" value="" class="field-password-a" /><small>Enter a new password</small></div><div><input type="password" name="password.confirm" value="" class="field-password-b" /><small>Confirm new password</small></div></dd></dl><div class="buttons"><a href="'+setupPath+'/c">Re-configure</a><input type="submit" value="Create user" /></div>';
}, function test(setupPath, configFile, config, request, cb){
	var db = getDb(config);
	if(!config || !db) return void cb(null, false);
	var nodes = db.collection('nodes');
	nodes.findOne({subject: config.siteSuperuser}, function(err, doc){
		if(err){ cb(err, false); return; }
		if(!doc){ cb(null, false); return; }
		cb(null, true);
	});
}, function setup(setupPath, configFile, config, request, cb){
	var db = getDb(config);
	if(!config || !config.siteBase) return void cb(new Error('Required setting siteBase is undefined'));
	if(typeof request.reqData=='string') parseData();
	else request.on('end', parseData);
	function parseData(){
		try{
			var formData = require('querystring').parse(request.reqData, /[;&]/g);
			if(!formData['accountname']) return void cb(new Error('Account name missing'));
			if(!formData['password.new'] || !formData['password.confirm'] ) return void cb(new Error('Password missing'));
			if(formData['password.new'] !== formData['password.confirm'] ) return void cb(new Error('Passwords do not match'));
			var userAccountName = formData['accountname'];
			var userPassword = formData['password.new'];
			var nodes = db.collection('nodes');
			var shadow = db.collection('shadow');
			var shadowId;
		}catch(e){
			cb(e);
			return;
		}
		// Remove the old shadow entry, if any
		nodes.findOne({subject: config.siteSuperuser}, function(err, doc){
			if(err) return void cb(err);
			if(doc){
				shadowId = doc && doc.password;
				if(shadowId instanceof mongodb.ObjectId){
					newPassword();
					return;
				}
				shadowId = new mongodb.ObjectId;
				nodes.update({_id:doc._id}, {$set: {password:shadowId, accountName:userAccountName}}, newPassword);
			}else{
				// Insert new user, if no record exists
				shadowId = new mongodb.ObjectId;
				var newUser = {_id:new mongodb.ObjectId, subject:config.siteSuperuser, type:[accountType], accountName:userAccountName, password:shadowId};
				nodes.save(newUser, newPassword);
			}
		});
		function newPassword(err){
			if(err) return void cb(err);
			authpbkdf2.generateRecord({password:userPassword}, function(record){
				record._id = shadowId;
				shadow.save(record, cb);
			});
		}
	}
});

addPage('z', 'Finished', function body(setupPath, configFile, config, request){
	return '<h1>Finish</h1><p>Please re-start the Magnode process and <a href="/login">login to your new website</a>!</p><p class="buttons"><i>Fin.</i></p>';
});

var dbConnections = {};
function getDb(config){
	if(config && (config.dbHost || config.dbName)){
		var dbid = config.dbHost + '+' + config.dbName;
		console.log('dbid:',dbid);
		if(dbConnections[dbid]) return dbConnections[dbid]
		var dbClient = new mongodb(config.dbHost);
		var db = config.dbName?dbClient.db(config.dbName):dbClient;
		return dbConnections[dbid] = db;
	}
}

module.exports = function(route, configFile){
	var rand = Math.floor(Math.random()*0xfffff).toString(32).replace(/l/g,'w').replace(/o/g,'x');
	var setupPath = '/setup-'+rand;
	var base = 'http://localhost/';
	try{
		var contents = fs.readFileSync(configFile, 'utf8');
		config = JSON.parse(contents);
		base = config.siteBase || base;
	}catch(e){}

	function response(request, response, matches){

		if(!response){
			// We weren't assigned to handle this one
			return;
		}
		if(matches[1]!==rand){
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
			{ dbHost: 'mongodb://localhost/magnode-localhost'
			, siteBase: 'http://localhost/'
			, siteSuperuser: 'http://localhost/user/root'
			, siteSecretKey: {file: 'session.key'}
			};
		try{
			var contents = fs.readFileSync(configFile, 'utf8');
			config = JSON.parse(contents);
		}catch(e){}

		var active = (matches[2]&&matches[2].length) ? matches[2].substr(1) : undefined;
		var activePage = menuItems[active] || pages[active];
		if(active!==undefined && activePage===undefined){
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
				v.test(setupPath, configFile, config, request, function(err, checkmark){console.log(v.id, checkmark);
					if(checkmark) return void testNextItem(i+1);
					if(v===activePage){
						response.statusCode = 500;
						writeResponse(v, '<h2>500 Error</h2><p>Failed to verify a setup step. Seek help, this is a bug.</p>');
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
				if(active===undefined && !checkmark){
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
				response.setHeader("Content-Type", "application/xhtml+xml");
			}else{
				response.setHeader("Content-Type", "text/html");
			}
			response.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><title>Magnode - Setup</title><style type="text/css">body {font-family: "Helvetica Neue","Helvetica",Helvetica,Arial,sans-serif;font-size: 14px;line-height: 1.25;}.row {width: 940px;max-width: 100%;/*min-width: 768px;*/margin: 0 auto;box-sizing: border-box;}.nav {width: 25%;padding: 0 15px;position: relative;float: left;box-sizing: border-box;font-color: #CCCCCC;}.main {width: 75%;padding: 0 15px;position: relative;float: right;box-sizing: border-box;}.full {width: 100%;float: left;min-height: 1px;padding: 0 15px;position: relative;box-sizing: border-box;}.nav ul {display: block;list-style: none;margin: 0;padding: 17px 0;}.nav li {display: block;list-style: none;margin: 0 0 12px 0;}li.active, li.active a {color: #444444;font-weight: bold;}.nav li > a {display: block;}a:hover {color: #3D68C2;}a, :link {color: #5077C8;text-decoration: none;line-height: inherit;}input[type="text"], input[type="password"], input[type="date"], input[type="datetime"], input[type="email"], input[type="number"], input[type="search"], input[type="tel"], input[type="time"], input[type="url"], textarea {box-sizing: border-box;font-family: "Helvetica Neue","Helvetica",Helvetica,Arial,sans-serif;border: 1px solid #CCC;-webkit-border-radius: 2px;-moz-border-radius: 2px;-ms-border-radius: 2px;-o-border-radius: 2px;border-radius: 2px;color: rgba(0, 0, 0, 0.85);display: block;font-size: 14px;margin: 0 0 12px 0;padding: 6px;width: 100%;}hr {border: solid #DDD;border-width: 1px 0 0;clear: both;margin: 22px 0 21px;height: 0;}h1 {margin-top: 17px;}dt {font-weight: bold;}dd {margin-left: 1em;margin-bottom: 0.75em;}dl {margin-bottom: 0.75em;}.buttons {text-align: right;}.buttons > input, .buttons > a {margin-left: 2em;}.nav a > span {float: right;font-weight: bold;color: #006600;}input.field-password-a, input.field-password-b {display: inline;width: 16em;margin-right: 1em;}.field-password-a + small, .field-password-b + small {font-size: 75%;}form {margin: 0;padding: 0;}code{font-weight: inherit;background: #B8C5E0;padding: 0px 3px 1px;}</style></head><body><div class="row"><div class="nav">Magnode - Setup</div><div class="main buttons">MAGNODE_CONF = <code>'+escapeHTML(configFile)+'</code></div></div><div class="row"><div class="full"><hr/></div></div><div class="row"><form action="'+setupPath+'/'+activePage.id+'" method="post" class="main">'+body+'</form><div class="nav"><ul id="menu">'+menuhtml+'</ul></div></div><div class="row"><div class="full"><hr/><p><a href="http://magnode.org/">Magnode.org</a></p></div></div></body></html>');
			response.end();
		}
	}
	var regex = new RegExp('^/setup-([^/]*)(/.*)?');
	route.push(regex, response);
	return setupPath;
};
