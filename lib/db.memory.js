/** Memory Database, an in-memory RDF store
 */
var sparqlParser=require('sparql-spin');
var rdf=require('rdf');

function insertIndex(i, a, b, c, t){
	if(!i[a]) i[a] = {};
	if(!i[a][b]) i[a][b] = {};
	i[a][b][c] = t;
}

function deleteIndex(i, a, b, c){
	if(i[a]&&i[a][b]&&i[a][b][c]){
		delete(i[a][b][c]);
		if(!Object.keys(i[a][b]).length) delete(i[a][b]);
		if(!Object.keys(i[a]).length) delete(i[a]);
	}
}

module.exports = function(config){
	var self=this;

	// The three data indexes that can handle any combination of unbound variables + known values in a triple
	// TODO Possibly we want a hash table for non-URI strings, like so: this.literals[HASH("datatype|@langauge value")]=js3 String
	this.clear();

	function r(v){ return (v&&v.resolve&&v.constructor==String)?v.resolve():v; }

	this.commit = function(){}

	/** Return a multi-result query, calling a callback multiple times
	 * @param Object bindings
	 * @param Object query
	 * @param function callback Called when all databases have populated the memory store
	 */
	this.callbackQuery = function(bindings, query, callbackResult, callbackPost, callbackPre){
		console.log('db.memory callbackQuery');
		callbackPre(null);
		callbackResult(null);
		callbackPost(null);
	}

	/** Return a multi-result query as an Array
	 */
	this.ArrayQuery = function(bindings, query, callback){
		console.log('db.memory ArrayQuery');
		q = (typeof(query)==="string")?sparqlParser.parse(query).ref("_:query").graphify():query;
		//console.log(q.graph);
		//console.log(q.index);
		//try{
			var result = this.evaluateQuery(q, "_:query", bindings);
			if(result) callback(null, result);
			else callback("Bad query");
		//}catch(e){
		//	console.log(e);
		//	callback(e);
		//}
	}

	/** Return a single result
	 */
	this.rowQuery = function(bindings, query, callback){
		console.log('db.memory rowQuery');
		q = (query.constructor===String)?sparqlParser.parse(query).ref("_:query").graphify():query;
		var r = this.evaluateQuery(q, "_:query", bindings);
		var row = r.length?r[0]:null;
		callback(null, row);
	}

	/** Return a multi-result query as an Array
	 */
	this.updateQuery = function(bindings, query, callback){
		console.log('db.memory updateQuery');
		callback(null);
	}

	/** Return a RDF subgraph of triples relevant to the input query
	 */
	this.describeQuery = function(query, callback){
		console.log('db.memory describeQuery');
		var q = sparqlParser.parse(querySPARQL).ref("_:query").graphify();
		var g = {}.ref().graphify();
		// Now parse out the query and add triples to the graph as necessary
		callback(g);
	}
}

module.exports.insertIndex = insertIndex;
module.exports.deleteIndex = deleteIndex;

module.exports.prototype = {
	get: function(){},
	objectString: function(o){
		if(o!==undefined && o.value){
			if(typeof(o.language)=="string") return "@"+o.language+" "+o.value;
			if(typeof(o.type)=="string") return o.type+" "+o.value;
		}
		// A URI won't have a space in it so just return
		return o.toString();
	},
	stringObject: function(o){
		var sep = o.indexOf(" ");
		// URI
		if(sep==-1) return o;
		// Typed literal
		if(o[0]=="@") return o.substr(sep+1).l(o.substr(0, sep));
		// Plain literal with a language
		//else return o.substr(sep+1).tl(o.substr(0, sep));
		else return rdf.context.convertType(o.substr(sep+1).tl(o.substr(0, sep)));
	},
	add: function(triple){
		//console.log("+ "+triple.subject+" "+triple.predicate+" "+triple.object+" .");
		var objectString = this.objectString(triple.object);
		insertIndex(this.indexOPS, objectString, triple.predicate, triple.subject, triple);
		insertIndex(this.indexPSO, triple.predicate, triple.subject, objectString, triple);
		insertIndex(this.indexSOP, triple.subject, objectString, triple.predicate, triple);
		//if(typeof(triple.object)!="string") this.objects[objectString]=triple.object;
		this.size++;
	},
	remove: function(triple){
		// We use .some to later switch to an RDF-specific function like js3 Object.equals()
		//var index = this.data[a][b].indexOf(data.d[a][b][i]);
		//if(index!==-1) this.data[a][b].splice(index, 1);
		//console.log("- "+s+" "+p+" "+o+" .");
		var objectString = this.objectString(triple.object);
		deleteIndex(this.indexOPS, objectString, triple.predicate, triple.subject);
		deleteIndex(this.indexPSO, triple.predicate, triple.subject, objectString);
		deleteIndex(this.indexSOP, triple.subject, objectString, triple.predicate);
		this.size--;
	},
	createIRI: function(v){return new api.IRI(v);},
	createPlainLiteral: function(){},
	createTypedLiteral: function(){},
	createBlankNode: function(){},
	createTriple: function(s, p, o){return new rdf.RDFTriple(s, p, o);},
	/**
	 * @implements DataStore.filter
	 */
	filter: function(pattern, element, filter){
		patternType = 0;
		if(!pattern) pattern = {};
		if(pattern.subject===undefined) patternType |= 4;
		else if(typeof(pattern.subject)==="string") pattern.subject=pattern.subject.resolve();
		if(pattern.property && pattern.predicate===undefined) pattern.predicate=pattern.property; //ugh
		if(pattern.predicate===undefined) patternType |= 2;
		else if(typeof(pattern.predicate)==="string") pattern.predicate=pattern.predicate.resolve();
		if(pattern.object===undefined) patternType |= 1;
		else if(typeof(pattern.object)==="string") var objectString=pattern.object.resolve();
		else var objectString=this.objectString(pattern.object);
		var index =
			[ {index:this.indexOPS, constants:["o", "p", "s"], variables:[]}
			, {index:this.indexPSO, constants:["p", "s"], variables:["o"]}
			, {index:this.indexSOP, constants:["s", "o"], variables:["p"]}
			, {index:this.indexSOP, constants:["s"], variables:["o", "p"]}
			, {index:this.indexOPS, constants:["o", "p"], variables:["s"]}
			, {index:this.indexPSO, constants:["p"], variables:["s", "o"]}
			, {index:this.indexOPS, constants:["o"], variables:["p", "s"]}
			, {index:this.indexPSO, constants:[], variables:["p", "s", "o"]}
			][patternType];
		var map = index.index;
		// Decend into index for known values
		for(var i=0; i<index.constants.length; i++){
			switch(index.constants[i]){
				case "s": map=map[pattern.subject]; break;
				case "p": map=map[pattern.predicate]; break;
				case "o": map=map[objectString]; break;
			}
			if(map===undefined) return [];
		}
		var list = [];
		// Recurse through the index
		function decend(index, variables){
			if(variables){
				for(var k in index){
					decend(index[k], variables-1);
				}
			}else{
				for(var k in index){
					//if(filter && !filter(index[k])) continue;
					list.push(index[k]);
				}
			}
		}
		decend(map, index.variables.length-1);
		return list;
	},
	getCollection: function(subject, callback){
		var collectionFirst = this.indexPSO["http://www.w3.org/1999/02/22-rdf-syntax-ns#first"];
		var collectionRest = this.indexPSO["http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];
		var nil = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";
		var collection = [];
		var first, rest=subject;
		while(rest && rest!=nil){
			var first = Object.keys(collectionFirst[rest])[0].toString();
			if(first===undefined || collection.indexOf(first)>=0) break;
			collection.push(first);
			rest = Object.keys(collectionRest[rest])[0].toString();
		}
		if(callback) callback(collection);
		return collection;
	},
	clear: function(){
		this.data = [];
		this.indexSOP = {};
		this.indexPSO = {};
		this.indexOPS = {};
		this.size = 0;
	},

	/** Quickly determine what types a given subject has (or given a predicate like its node ID)
	 */
	getNodeTypes: function(subject, callback){
		console.log('db.memory getNodeTypes '+subject);
		var rdftype = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		if(!this.indexPSO[rdftype]) callback(null, []);
		else if(!this.indexPSO[rdftype][subject]) callback(null, []);
		else callback(null, Object.keys(this.indexPSO[rdftype][subject]));
	},
	evaluateQuery: function(queryGraph, querySubject, objectBindings){
		var self=this;
		function sp(v){ return "http://spinrdf.org/sp#".toString().concat(v); }
		var sp_ = sp("_");
		// FIXME we need to check if the rdf:type says variable and not check the URI
		// TODO variables are bnodes
		function isVariable(v){return v.value.substr(0,sp_.length)==sp_};
		function varName(v){return v.substr(0,sp_.length)==sp_ && v.replace(sp_, "")};
		var querySubject = querySubject||"_:query";
		//var query = queryGraph.subject(querySubject);

		var bindings = {};
		for(var f in (objectBindings||{})) bindings[f]=self.objectString(objectBindings[f]);

		function constructTriples(template, result){
			var triples = []; // Later maybe we want a triple store?
			var templates = [];
			var rest = template;
			var first;
			var nil = "rdf:nil".resolve();
			// First make sure there's no problems with the structure...
			while(rest && rest!=nil){
				first = queryGraph.filter({subject:rest, predicate:"rdf:first"}).map(function(v){return v.object})[0];
				rest = queryGraph.filter({subject:rest, predicate:"rdf:rest"}).map(function(v){return v.object})[0];
				// first is the triple pattern
				var subject = queryGraph.filter({subject:first, predicate:sp("subject")}).map(function(v){return v.object})[0];
				var predicate = queryGraph.filter({subject:first, predicate:sp("predicate")}).map(function(v){return v.object})[0];
				var object = queryGraph.filter({subject:first, predicate:sp("object")}).map(function(v){return v.object})[0];
				templates.push(new rdf.RDFTriple(subject, predicate, object));
			}
			// Now build the triples
			for(var i=0; i<result.length; i++){
				var res=result[i];
				console.log("RESULT:");
				console.log(res);
				for(var j=0; i<templates.length; i++){
					var tpl=templates[i];
					var v;
					triples.push(new rdf.RDFTriple(res[varName(tpl.subject)]||tpl.subject, res[varName(tpl.predicate)]||tpl.predicate, res[varName(tpl.object)]||tpl.object));
				}
			}
			return triples;
		}

		function orderResults(orderBy, result){
			var order = [];
			var rest = orderBy;
			var first;
			var nil = "rdf:nil".resolve();
			// First make sure there's no problems with the structure...
			while(rest && rest!=nil){
				first = queryGraph.filter({subject:rest, predicate:"rdf:first"}).map(function(v){return v.object})[0];
				rest = queryGraph.filter({subject:rest, predicate:"rdf:rest"}).map(function(v){return v.object})[0];
				// Test if this is ASC or DESC or default
				var direction = 0;
				if(queryGraph.filter({subject:first, predicate:"rdf:type", object:"sp:Asc"})[0]){
					direction = 1;
				}else if(queryGraph.filter({subject:first, predicate:"rdf:type", object:"sp:Desc"})[0]){
					direction = -1;
				}
				if(direction){
					var expression = queryGraph.filter({subject:first, predicate:"sp:expression"}).map(function(v){return v.object})[0];
					order.push({direction:direction, field:varName(expression)||expression});
				}else{
					// No explicit direction defaults to ASC
					order.push({direction:1, field:varName(first)||first});
				}
			}
			return result.sort(function(a, b){
				for(var i=0; i<order.length; i++){
					if(a[order[i].field] && b[order[i].field]){
						if(a[order[i].field]>b[order[i].field]) return order[i].direction;
						if(a[order[i].field]<b[order[i].field]) return -order[i].direction;
					}
				}
				return 0;
			});
		}
		
		var queryTypes = queryGraph.filter({subject:querySubject, predicate:"rdf:type"}).map(function(v){return v.object});
		var queryType, processResult;
		for(var i=0;i<queryTypes.length;i++){
			switch(queryTypes[i]){
				case "http://spinrdf.org/sp#Select":
					queryType = "Select";
					var orderBy = queryGraph.filter({subject:querySubject, predicate:sp("orderBy")}).map(function(v){return v.object})[0];
					processResult = function(results){return orderBy?orderResults(orderBy, results):results};
					break;
				case "http://spinrdf.org/sp#Construct":
					queryType = "Construct";
					var template = queryGraph.filter({subject:querySubject, predicate:sp("templates")}).map(function(v){return v.object})[0];
					if(!template){
						throw new Error("Construct query that has no template");
					}
					processResult = function(results){return constructTriples(template, results)};
					break;
				case "http://spinrdf.org/sp#Modify":
					queryType = "Modify";
					var deletePattern = queryGraph.filter({subject:querySubject, predicate:sp("deletePattern")}).map(function(v){return v.object})[0];
					if(!deletePattern){
						throw new Error("Modify query that has no deletePattern");
					}
					var insertPattern = queryGraph.filter({subject:querySubject, predicate:sp("insertPattern")}).map(function(v){return v.object})[0];
					if(!insertPattern){
						throw new Error("Modify query that has no insertPattern");
					}
					processResult = function(results){
						// Delete first
						var deleteTriples = constructTriples(deletePattern, results);
						var insertTriples = constructTriples(insertPattern, results);
						for(var i=0; i<deleteTriples.length; i++) self.remove(deleteTriples[i]);
						for(var i=0; i<insertTriples.length; i++) self.add(insertTriples[i]);
						self.commit();
						return {"delete":deleteTriples, "insert":insertTriples};
					};
					break;
			}
		}
		if(!queryType) throw new Error("Not a sp:Select, sp:Construct, or sp:Modify query");
		var matches = [];
		// resultVars = ?querySubject/sp:resultVariables
		var resultVars = queryGraph.filter({subject:querySubject, predicate:"sp:resultVariables"});
		resultVars = (resultVars[0]&&resultVars[0].object) || null;

		// Calculate the indexes the conditions will use
		// conditions = ?querySubject/sp:where
		// FIXME use RDF Collections not property sets which are unbound in an open world system
		var conditions = queryGraph.filter({subject:querySubject, predicate:"sp:where"}).map(function(v){return v.object;});
		var patternIndexMap =
				[ {index:this.indexOPS, constants:["object", "predicate", "subject"], variables:[]}
				, {index:this.indexPSO, constants:["predicate", "subject"], variables:["object"]}
				, {index:this.indexSOP, constants:["subject", "object"], variables:["predicate"]}
				, {index:this.indexSOP, constants:["subject"], variables:["object", "predicate"]}
				, {index:this.indexOPS, constants:["object", "predicate"], variables:["subject"]}
				, {index:this.indexPSO, constants:["predicate"], variables:["subject", "object"]}
				, {index:this.indexOPS, constants:["object"], variables:["predicate", "subject"]}
				, {index:this.indexPSO, constants:[], variables:["predicate", "subject", "object"]}
				];

		function recurseConditions(bindings, conditions, conditionNo){
			var patternURI = conditions[conditionNo];
			// Not an RDF Collection -- Not yet?
			var types = queryGraph.filter({subject:patternURI, predicate:"rdf:type"}).map(function(v){return v.object;});
			if(types.some(function(v){return v==sp("Filter");})){

			}else if(types.some(function(v){return v==sp("Optional");})){

			}else if(types.some(function(v){return v==sp("Union");})){

			}else if(types.some(function(v){return v==sp("TriplePath");})){
				console.log("Matching sp:TriplePath");
				function iterateOverPath(path, start){
					//var path=queryGraph.subject(subject);
					console.log("iterateOverPath: "+path.value+": "+path("rdf:type").value);
					if(path("rdf:type").some("sp:SeqPath")){
						var object = start;
						var subpath = path("sp:subPath");
						while(!subpath.some("rdf:nil")){
							var p = subpath("rdf:first");
							// object = indexPSO[ p.value ][ object ].keys()
							var o = [];
							p.value.forEach(function(v){
								object.forEach(function(w){
									o.push.apply(null, indexPSO[v][w].keys());
								});
							});
							object = o;
							subpath = subpath("rdf:rest");
						}
						return v;
					}
				}

				// Copy bindings as to not change the paramater
				var nbindings = {};
				for(var n in bindings) nbindings[n]=bindings[n];

				// If both subject and object are constant, what are we doing here? There's nothing we need to bind
				// If the subject is constant, follow the path from that
				// If the subject is a bound variable, follow the path from that
				// If the object is a constant, reverse the pattern and follow that
				// If both subject and object are unbound, we're screwed... Iterate through the possible bindings
				if(pattern('sp:subject').some(isVariable)){
					var vname = varName(pattern('sp:subject')());
					if(nbindings[vname]===undefined){
						for(var j in indexSOP){
							nbindings[vname] = j;
							iterateOverPath(pattern('sp:path'), [j]);
						}
					}else{
						iterateOverPath(pattern('sp:path'), pattern('sp:subject').value);
					}
				}else{
					iterateOverPath(pattern('sp:path'), pattern('sp:subject').value);
				}
			}else if(types.some(function(v){return v==sp("TriplePattern");})){
				// We _require_ sp:TriplePattern be defined
				// else who knows what type of object it could be

				//console.log("Matching sp:TriplePattern");

				// Let's check which index to use based on what parts are unbound variables
				// TODO perhaps PSO order and not POS order would be faster e.g. reverse the index orders
				var patternType = 0;
				function isUnboundVariable(p){
					return queryGraph.filter({subject:patternURI, predicate:p}).map(function(v){return v.object;}).some(function(v){return isVariable(v) && bindings[varName(v)]===undefined; });
				}
				if(isUnboundVariable('sp:subject')) patternType |= 4;
				if(isUnboundVariable('sp:predicate')) patternType |= 2;
				if(isUnboundVariable('sp:object')) patternType |= 1;
				//console.log("Pattern "+pattern()+" type="+patternType+": " + pattern('sp:subject')() + " " + pattern('sp:predicate')() + " " + pattern('sp:object')() + " .");
				// If the statement has no variables or all bound variables, verify the bindings match a triple
				// If the statement has unbound variables, iterate through all the possible bindings
			
				var index = patternIndexMap[patternType].index;
				function isBound(v){
					// Get the node under the triple
					var f= queryGraph.filter({subject:patternURI, predicate:sp(v)});
					if(v=="object") return self.objectString(f[0].object);
					return f[0].object;
				}
				var indexConstants = patternIndexMap[patternType].constants.map(isBound);
				var indexVariables = patternIndexMap[patternType].variables.map(isBound);

				// Copy bindings as to not change the paramater
				var nbindings = {};
				for(var n in bindings) nbindings[n]=bindings[n];

				// Decend into index for known values
				for(var i=0; i<indexConstants.length; i++){
					// If it's a variable, we need to use its value
					var value = isVariable(indexConstants[i])?bindings[varName(indexConstants[i])]:indexConstants[i];
					if(index[value]===undefined) return;
					index = index[value];
				}

				// Now recurse through bindings for the variables
				for(var i=0; i<indexVariables.length; i++){
					var vname = varName(indexVariables[i]);
					if(nbindings[vname]===undefined){
						// Iterate through triples calling this function again, with the variable bound
						for(var j in index){
							nbindings[vname] = j.resolve();
							recurseConditions(nbindings, conditions, conditionNo);
						}
						// All done recursing
						return;
					}else{
						// So vname is already bound to nbindings[vname]
						if(index[nbindings[vname]]){
							// Decend index into variable value
							index = index[nbindings[vname]];
						}else{
							// but no such triple exists for this pattern
							return;
						}
					}
				}
				if(conditions[conditionNo+1]) recurseConditions(nbindings, conditions, conditionNo+1);
				else {
					for(var f in nbindings) nbindings[f] = self.stringObject(nbindings[f]);
					matches.push(nbindings);
				}
			}else{
				console.log("Couldn't identify match condition type");
			}
		}
		recurseConditions(bindings, conditions, 0);
		//console.log(matches);
		return processResult(matches);
	}
}
