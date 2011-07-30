/*
Transform:HTTP
	a view:ModuleTransform ;
	jst:module "magnode/transform.HTTP" ;
	view:range type:HTTPRequest-www-form-urlencoded ;
	view:domain type:Document .
*/
var util=require("util");

var rdf=require("rdf");
rdf.context.setMapping("sp","http://spinrdf.org/sp#");

function stringtoType(value, type){
	if(type=="URI" || type=="") return value;
	if(type[0]=="@") return value.l(type);
	return type.tl(type);
}

module.exports = function(db, transform, input, render, callback){
	var fields = input["http://magnode.org/FormFieldData"];
	var request = input.request;
	var response = input.response;
	var authz = input.authz;

	response.setHeader("Content-Type", "text/plain");
	var query =
		{ a:'sp:Modify'
		, sp$where: []
		, sp$deletePattern: [].toList()
		, sp$insertPattern: [].toList()
		};

	var length = fields['field.length'];
	for(var i=0; i<length; i++){
		query.sp$where.push(
			{ a: 'sp:TriplePattern'
			, sp$subject: fields['field.'+i+'.subject']
			, sp$predicate: fields['field.'+i+'.field']
			, sp$object: "sp:_field_"+i
			});
		//	where.push({ a:'sp:Filter', 'sp:expression':{ a:'sp:eq', arg:['sp:_verify_'+f, {a:'m:sha1', arg:'sp:_del_'+f} ] }});
		query.sp$deletePattern.push(
			{ a: 'sp:TriplePattern'
			, sp$subject: fields['field.'+i+'.subject']
			, sp$predicate: fields['field.'+i+'.field']
			, sp$object: "sp:_field_"+i
			});
		query.sp$insertPattern.push(
			{ a: 'sp:TriplePattern'
			, sp$subject: fields['field.'+i+'.subject']
			, sp$predicate: fields['field.'+i+'.field']
			, sp$object: stringtoType(fields['field.'+i+'.value'], fields['field.'+i+'.type'])
			});
	}

	authz({method:"PUT", resource:input.resource}, function(result){if(result){
		var g = query.ref("_:query").graphify();
		var r = input.db.evaluateQuery(g, "_:query", {});
		/*
		response.write("Query: ");
		response.write(util.inspect(query));
		response.write("\n\n");

		response.write("Fields: ");
		response.write(util.inspect(fields));
		response.write("\n\n");

		response.write("Result: ");
		response.write(util.inspect(r));
		response.write("\n\n");
		*/
		// respond with "303 See Other" and "Location:" to that resource
		// (instruct the client to GET the newly updated resource), and return
		response.statusCode = 303;
		// Use of ternary operator without syntax highlighting mind == blown
		response.setHeader("Location", request.url.replace(/(\?|&)edit($|&)/,function(a,b,c){return c=='&'&&b=='?'?'?':'';}));
		response.end("transform.autoHTMLBodyFormPost: Update <"+input.resource+">\n");

		callback({"http://magnode.org/HTTPResponse":303});
	}else{
		response.statusCode = 403;
		response.end("transform.autoHTMLBodyFormPost: Update <"+input.resource+">: Denied\n");
		callback({"http://magnode.org/HTTPResponse":403});
	}});
}
module.exports.URI = "http://magnode.org/transform/autoHTMLBodyFormPost";
