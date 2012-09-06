
function populateForms(){
	var es = document.getElementsByClassName('field-json');
	for(var i=0; i<es.length; i++){
		try{
			var editor = CodeMirror.fromTextArea(es[i], {lineNumbers:true, mode:'application/json'});
		}catch(e){}
	}

	var es = document.getElementsByClassName('field-textarea');
	for(var i=0; i<es.length; i++){
		try {
			var editor = CodeMirror.fromTextArea(es[i], {lineNumbers:true, lineWrapping:true, mode:'text/html'});
		}catch(e){}
	}

	var es = document.getElementsByClassName('field-code');
	for(var i=0; i<es.length; i++){
		try {
			es[i].className.split(/\s+/g).some(function(v){
				var p = 'type:';
				if(v.substr(0,p.length)==p){
					CodeMirror.fromTextArea(es[i], {lineNumbers:true, lineWrapping:true, mode:v.substr(p.length)});
					return true;
				}
			});
		}catch(e){}
	}
};
document.addEventListener("DOMContentLoaded", populateForms, false);
