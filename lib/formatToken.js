var ObjectId = require('mongolian').ObjectId;

function cshiftl(v){
	return ((v<<1)+(v>>7))&0xFF;
}
exports.cshiftl = cshiftl;

function mix(s){
	var out = Buffer(s.length);
	s.copy(out);
	for(var i=1; i<out.length; i++) out[i] ^= cshiftl(out[i-1]);
	for(var i=out.length; i>0; i--) out[i-1] ^= cshiftl(out[i]);
	return out;
}
exports.mix = mix;

function formatComponent(value, parts){
	while(value && parts[0]){
		var name = parts.shift();
		value = value[name];
		if(value instanceof Array){
			if(parts[0].substr(0,4)=='join'){
				return value.map(function(w){ return formatComponent(w, parts).slice(); }).join(parts[0].substr(4));
			}
			return v.join(',');
		}
		if(value instanceof Date){
			switch(parts[0]){
				case 'getTime': return value.getTime();
				case 'getTimezoneOffset': return value.getTimezoneOffset();
				case 'toISOString': return value.toISOString();
				case 'toUTCString': return value.toUTCString();
				case 'UY': return ('0000'+value.getUTCFullYear()).substr(-4);
				case 'Y': return ('0000'+value.getFullYear()).substr(-4);
				case 'Um': return ('00'+(value.getUTCMonth()+1)).substr(-2);
				case 'm': return ('00'+(value.getMonth()+1)).substr(-2);
				case 'Ud': return ('00'+value.getUTCDate()).substr(-2);
				case 'd': return ('00'+value.getDate()).substr(-2);
				case 'UH': return ('00'+value.getUTCHours()).substr(-2);
				case 'H': return ('00'+value.getHours()).substr(-2);
				case 'Ui': return ('00'+value.getUTCMinutes()).substr(-2);
				case 'i': return ('00'+value.getMinutes()).substr(-2);
				case 'Us': return ('00'+value.getUTCSeconds()).substr(-2);
				case 's': return ('00'+value.getSeconds()).substr(-2);
				case 'Uu': return ('0000'+value.getUTCMilliseconds()).substr(-4);
				case 'u': return ('0000'+value.getMilliseconds()).substr(-4);
			}
			return value.toString();
		}
		if(value instanceof ObjectId){
			switch(parts[0]){
				case 'mix': return mix(value.bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
				case 'base64': return value.toString('base64');
				case 'hex': return value.toString('hex');
				case 'utf8': return value.toString('utf8');
			}
			return value.toString();
		}
		if(typeof value=='string'){
			switch(parts[0]){
				case 'length': return value.length;
				case 'formatURL': return encodeURI(value.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-'));
			}
			return v;
		}
		if(typeof v=='number'){
			switch(parts[0]){
				case 'length': return v.length;
			}
			if(parts[0].substr(0,8)=='toString'){
				var radix = parseInt(parts[0].substr(8)) || undefined;
				return value.toString(radix);
			}
			if(parts[0].substr(0,7)=='toFixed'){
				var precision = parseInt(parts[0].substr(7)) || undefined;
				return value.toFixed(precision);
			}
			if(parts[0].substr(0,13)=='toExponential'){
				var precision = parseInt(parts[0].substr(13)) || undefined;
				return value.toExponential(precision);
			}
			return v;
		}
		if(typeof v=='boolean'){
			switch(parts[0]){
				case 'number': return v?'1':'0';
				case 'string': return v.toString();
			}
			return v;
		}
	}
	return 'undefined';
}
exports.formatComponent = formatComponent;

function subst(document, m, expr){
	var parts = expr.split('.');
	// Expressions are relative to the posted document root, not instance (which would just be a string)
	return formatComponent(document, parts);
}
exports.subst = subst;

function formatToken(document, pattern){
	return pattern.replace(/\{([^}]+)\}/g, subst.bind(null, document));
}
exports.formatToken = formatToken;

return exports;
