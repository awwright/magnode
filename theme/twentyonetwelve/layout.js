
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

	var es = document.getElementsByClassName('field-array');
	for(var i=0; i<es.length; i++) (function(field){
		try {
			var blank = field.lastElementChild.cloneNode(true);
			field.removeChild(field.lastElementChild);
			var additem_li = document.createElement('li');
			var additem_a = document.createElement('a');
			additem_a.href="javascript:;";
			additem_a.appendChild(document.createTextNode('Add new'));
			additem_li.appendChild(additem_a);
			additem_a.onclick = function(){
				var e = field.nextElementSibling.nextElementSibling;
				if(!e || e.name.substr(0,7)!='length.') throw new Error('No length element to modify?');
				var clone = blank.cloneNode(true);
				clone.firstElementChild.name = clone.firstElementChild.name.replace('new', e.value);
				field.insertBefore(clone, additem_li);
				e.value = parseInt(e.value)+1;
			};
			field.appendChild(additem_li);
		}catch(e){throw e;}
	})(es[i]);

};
document.addEventListener("DOMContentLoaded", populateForms, false);
