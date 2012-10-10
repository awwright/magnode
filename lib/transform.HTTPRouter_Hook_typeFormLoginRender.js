module.exports = function(db, transform, input, render, callback){
	var subject = input['http://magnode.org/FormLoginRender'];

	var q = input.db.filter({object:subject, predicate:'http://magnode.org/register'});
	if(!q[0] || !q[0].object) throw new Error('No router for '+subject+' found!');
	var router = q[0].subject;

	var q = input.db.match(subject, 'http://magnode.org/path');
	if(!q[0] || !q[0].object) throw new Error('No path for '+subject+' given!');
	var path = q[0].object.toString();

	var q = input.db.match(subject, 'http://magnode.org/render');
	if(!q[0] || !q[0].object) throw new Error('No render for '+subject+' found!');
	var renders = q[0].object;

	var q = input.db.match(subject, 'http://magnode.org/target');
	if(!q[0] || !q[0].object) throw new Error('No hook target for '+subject+' found!');
	var target = q[0].object;

	var targets = {};

	var resources =
		{ 'http://magnode.org/HTTPRouter': router
		, db: input.db
		};
	render.render('http://magnode.org/HTTPRouter_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/HTTPRouter_Instance']) throw new Error('HTTPRouter_Instance for '+subject+' could not be created');
		if(targets) targets['http://magnode.org/HTTPRouter_Instance']=r['http://magnode.org/HTTPRouter_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/AuthHTTPForm': target
		, db: input.db
		};
	render.render('http://magnode.org/AuthHTTPForm_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/AuthHTTPForm_Instance']) throw new Error('AuthHTTPForm_Instance for '+subject+' could not be created');
		if(targets) targets['http://magnode.org/AuthHTTPForm_Instance']=r['http://magnode.org/AuthHTTPForm_Instance'];
		if(end) end();
	});

	var resources =
		{ 'http://magnode.org/Render': renders
		, db: input.db
		};
	render.render('http://magnode.org/Render_Instance', resources, [], function(r){
		if(!r || !r['http://magnode.org/Render_Instance']) throw new Error('Render <'+renders+'> for <'+subject+'> could not be created');
		if(targets) targets['http://magnode.org/Render_Instance']=r['http://magnode.org/Render_Instance'];
		if(end) end();
	});

	var end = function(){
		if(!targets) return;
		var required =
			[ 'http://magnode.org/AuthHTTPForm_Instance'
			, 'http://magnode.org/Render_Instance'
			, 'http://magnode.org/HTTPRouter_Instance'
			];
		if(!required.every(function(v){return targets[v];})) return;

		var resources = {};

		targets['http://magnode.org/AuthHTTPForm_Instance'].routeForm(targets['http://magnode.org/HTTPRouter_Instance'], resources, targets['http://magnode.org/Render_Instance'], path);

		callback({"http://magnode.org/HTTPRouter_Hook":[]});
		targets = false;
	}
	if(end) end();
}
module.exports.URI = "http://magnode.org/transform/HTTPRouter_Hook_typeFormLoginRender";
module.exports.about =
	{ a: ['view:Transform']
	, 'view:domain': {$list:['type:FormLoginRender']}
	, 'view:range': 'type:HTTPRouter_Hook'
	}
