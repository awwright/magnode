/**
 * Load usernames/passwords from an Apache htdigest file
 */
var fs=require('fs');
var rdf=require('rdf');
var dbMemory=require('magnode/db.memory');

function htdigest(v){
	return "http://magnode.org/auth/htdigest#"+v;
}

module.exports = function(file, userPrefix){
	if(!file) throw new Error("No htdigest file specified");
	var lines = fs.readFileSync(file, "utf8").split("\n");
	var records = 0;
	for(i=0;i<lines.length;i++){
		var line = (lines[i]).split(":",3);
		if(line.length!==3) continue;
		var user = (userPrefix||"/") + line[0];
		this.add(new rdf.RDFTriple(user, "rdf:type".resolve(), "foaf:account".resolve()));
		this.add(new rdf.RDFTriple(user, "rdf:type".resolve(), htdigest("Account")));
		this.add(new rdf.RDFTriple(user, "foaf:accountName".resolve(), line[0].l()));
		this.add(new rdf.RDFTriple(user, htdigest("password_digest_realm"), line[1].l()));
		this.add(new rdf.RDFTriple(user, htdigest("password_digest_md5"), line[2].l()));
		records++;
	}
	console.log('db.auth-htdigest init: Loaded '+records+' records from '+lines.length+' lines in '+file);
}
module.exports.prototype = new dbMemory;
