var htmlns = "http://www.w3.org/1999/xhtml";

function logError(e){
	if(typeof console=='object' && console.log){
		console.log(e);
	}
}

function populateForms(doc){
	if(!doc) doc = document;

	var es = doc.getElementsByClassName('field-array-new');
	for(var i=0; i<es.length; i++) (function(field){
		try {
			var eLength = field.nextElementSibling;
			// FIXME this should be '.length' if we know there's always going to be a name of the root instance
			if(!eLength || eLength.name.substr(-7)!=':length') return;
			var fieldName = eLength.name.substr(0, eLength.name.length-7)+'.:new';
			var blank = field.lastElementChild.cloneNode(true);
			field.removeChild(field.lastElementChild);
			var additem_li = document.createElement('li');
			var additem_a = document.createElement('a');
			additem_a.href="javascript:;";
			additem_a.appendChild(document.createTextNode('Add new item'));
			additem_li.appendChild(additem_a);
			additem_a.onclick = function(){
				var e = field.nextElementSibling;
				var clone = blank.cloneNode(true);
				function updateNames(ele){
					if(typeof ele.name=='string' && ele.name.substr(0,fieldName.length)==fieldName){
						ele.name = ele.name.substr(0,fieldName.length-4)+eLength.value+ele.name.substr(fieldName.length);
					}else if(ele.hasChildNodes && ele.hasChildNodes()){
						for(var i=0; i<ele.childNodes.length; i++) updateNames(ele.childNodes[i]);
					}
				}
				updateNames(clone);
				field.insertBefore(clone, additem_li);
				eLength.value = parseInt(eLength.value)+1;
				populateForms(clone);
			};
			field.appendChild(additem_li);
		}catch(e){logError(e);}
	})(es[i]);

	var es = doc.getElementsByClassName('field-object-new');
	for(var i=0; i<es.length; i++) (function(field){
		try {
			var eLength = field.nextElementSibling;
			if(!eLength || eLength.name.substr(-7)!=':length') return;
			var fieldName = eLength.name.substr(0, eLength.name.length-7)+'.:new';
			var blankDt = field.lastElementChild.previousElementSibling.cloneNode(true);
			var blankDd = field.lastElementChild.cloneNode(true);
			field.removeChild(field.lastElementChild.previousElementSibling);
			field.removeChild(field.lastElementChild);
			var additem_dt = document.createElement('dt');
			var additem_a = document.createElement('a');
			additem_a.href="javascript:;";
			additem_a.appendChild(document.createTextNode('Add new property'));
			additem_dt.appendChild(additem_a);
			var additem_dd = document.createElement('dd');
			additem_dd.appendChild(document.createTextNode(''));
			additem_a.onclick = function(){
				var cloneDt = blankDt.cloneNode(true);
				var cloneDd = blankDd.cloneNode(true);
				function updateNames(ele){
					if(typeof ele.name=='string' && ele.name.substring(0,fieldName.length)==fieldName){
						ele.name = ele.name.substr(0,fieldName.length-4)+eLength.value+ele.name.substr(fieldName.length);
					}else if(ele.hasChildNodes && ele.hasChildNodes()){
						for(var i=0; i<ele.childNodes.length; i++) updateNames(ele.childNodes[i]);
					}
				}
				updateNames(cloneDt);
				updateNames(cloneDd);
				field.insertBefore(cloneDt, additem_dt);
				field.insertBefore(cloneDd, additem_dt);
				eLength.value = parseInt(eLength.value)+1;
				populateForms(cloneDd);
			};
			field.appendChild(additem_dt);
			field.appendChild(additem_dd);
		}catch(e){logError(e);}
	})(es[i]);

	var es = doc.getElementsByClassName('field-json');
	for(var i=0; i<es.length; i++){
		if(es[i].tagName.toLowerCase()!=='textarea') continue;
		try{
			var editor = CodeMirror.fromTextArea(es[i], {lineNumbers:true, indentWithTabs:true, tabSize: 4, indentUnit:4, mode:'application/json'});
		}catch(e){logError(e);}
	}

	var es = doc.getElementsByClassName('field-html');
	for(var i=0; i<es.length; i++){
		if(es[i].tagName.toLowerCase()!=='textarea') continue;
		try {
			var editor = CodeMirror.fromTextArea(es[i], {lineNumbers:true, lineWrapping:true, indentWithTabs:true, tabSize: 4, indentUnit:4, mode:'text/html'});
		}catch(e){logError(e);}
	}

	var es = doc.getElementsByClassName('field-code');
	for(var i=0; i<es.length; i++){
		try {
			es[i].className.split(/\s+/g).some(function(v){
				var p = 'type:';
				if(v.substr(0,p.length)==p){
					CodeMirror.fromTextArea(es[i], {lineNumbers:true, lineWrapping:true, indentWithTabs:true, tabSize: 4, indentUnit:4, mode:v.substr(p.length)});
					return true;
				}
			});
		}catch(e){logError(e);}
	}

	var es = doc.getElementsByClassName('field-switch');
	for(var i=0; i<es.length; i++) (function(field){
		try {
			var eSwitch = field.firstElementChild;
			eSwitch.onchange = function(){
				hideAll(eSwitch.selectedIndex*2+1);
			}
			var ePane = eSwitch.nextElementSibling;
			function hideAll(x){
				var ex = ePane.firstElementChild;
				var i = 0;
				while(ex){
					ex.style.display = i++===x ? 'block' : 'none';
					ex = ex.nextElementSibling;
				}
			}
			hideAll(1);
		}catch(e){logError(e);}
	})(es[i]);

	var es = doc.getElementsByClassName('field-autocomplete');
	for(var i=0; i<es.length; i++) (function(field){
		try {
			var m = field.className.match(/(\s|^)autocomplete-endpoint<([^>\s]*)>(\s|$)/);
			var a = new WidgetAutocomplete(field, m&&m[2]||'');
			field.parentNode.appendChild(a.results);
			a.onselect = function(e){
				var value = e.element.textContent;
				var e_a = e.element && e.element.firstElementChild;
				if(e_a && e_a.href){
					value += ' <'+e_a.href+'>';
				}else if(e_a && e_a.className=='label-create'){
					value += ' (_:new'+0+')';
				}
				this.input.value = value;
			};
		}catch(e){logError(e);}
	})(es[i]);

};
document.addEventListener("DOMContentLoaded", function(){ populateForms(document); }, false);

function WidgetAutocomplete(ele, endpoint){
	this.searching = false;
	this.currentSearch = "";
	this.selectedIndex = -1;
	this.timeout = null;
	this.input = ele;
	this.endpoint = endpoint;
	this.results = document.createElement('div');
	this.results.className = 'autocomplete-results';
	this.results.style.display = 'none';
	this.results.addEventListener('mousedown', function(e) {
		e.preventDefault();
	});
	this.initElement(ele);
	this.onselect = function(){};
}
WidgetAutocomplete.prototype.initElement = function initElement(e){
	var self = this;
	e.addEventListener('blur', function() {
		self.resetForm();
	});
	e.addEventListener('keyup', function() {
		self.runSearch();
	});
	e.addEventListener('keydown', function(event) {
		switch(event.which){
			case 8:
			case 9:
			case 13:
			case 27:
				break;
			default:
				self.results.style.display = 'block';
		}
		self.highlight(self.selectedIndex);
		switch (event.which) {
			case 8: // Backspace
			case 9: // Tab
				break;
			case 13: // Enter
				event.preventDefault();
				var e = self.results.getElementsByTagName('li')[self.selectedIndex];
				if(e) self.go(e);
				return false;
			case 27: // Escape
				self.resetForm();
				break;
			case 38: // Up
				event.preventDefault();
				self.resultsNav(-1);
				break;
			case 40: // Down
				event.preventDefault();
				self.resultsNav(1);
				break;
		}
	});
};
WidgetAutocomplete.prototype.runSearch = function runSearch() {
	var q = this.input.value;
	var self = this;
	function resultsTimeout(){
		self.searching = false;
		self.runSearch();
	}
	function haveResults(e){
		while(self.results.lastChild) self.results.removeChild(self.results.lastChild);
		var autocompleteSrc = e.getElementsByClassName('autocomplete')[0] || e.getElementsByTagNameNS(htmlns,'ul')[0];
		self.results.appendChild(autocompleteSrc.cloneNode(true));
		var list = self.results.getElementsByTagName('li');
		for(var i=0; i<list.length; i++) (function(li){
			var alist = li.getElementsByTagName('a');
			for(var j=0; j<alist.length; j++){
				alist[j].onclick = function(e){
					e.preventDefault();
					self.go(li);
					return false;
				};
			}
		})(list[i]);
		self.highlight();
		self.searching = false;
	}
	if(q.length<2){
		this.resetForm();
		return false;
	}else if(self.searching){
		clearTimeout(self.timeout);
		self.timeout=setTimeout(resultsTimeout, 300);
		return;
	}
	self.searching=true;
	if(q==self.currentSearch) return;
	self.currentSearch = q;
	self.results.textContent = '...';
	var request = new XMLHttpRequest();
	var requestUri = this.endpoint.replace(/{q}/, encodeURIComponent(q));
	request.open('GET', requestUri, true);
	request.onload = function() {
		if (this.status>=200 && this.status<400){
			haveResults(this.responseXML);
		} else {
			self.results.textContent = '[HTTP Error: '+this.status+']';
		}
	};
	request.onerror = function() {
		self.results.textContent = '[Connection Error]';
	};
	request.send();
};
WidgetAutocomplete.prototype.go = function go(e) {
	var t = e && e.getAttribute("href");
	if (!t) {
		var o = this.input.value;
		// FIXME use fully formatted endpoint
		var t = this.endpoint + "?search=" + o;
	}
	this.resetForm();
	// window.location.href = t;
	this.onselect.call(this, {element:e});
};
WidgetAutocomplete.prototype.resultsNav = function resultsNav(e) {
	// descending, so 1=="down"
	this.selectedIndex += e;
	this.highlight(this.selectedIndex);
};
WidgetAutocomplete.prototype.highlight = function highlight() {
	var list = this.results.getElementsByTagName('li');
	for(var i=0; i<list.length; i++){
		list[i].className = list[i].className.replace(/(^|\b)h(\b|$)/g, '');
	}
	this.results.style.width = this.input.offsetWidth+'px';
	if(this.selectedIndex > list.length) this.selectedIndex = 0;
	if(this.selectedIndex<=-1) this.selectedIndex=-1;
	if(list[this.selectedIndex]) list[this.selectedIndex].className += " h";
};
WidgetAutocomplete.prototype.resetForm = function resetForm() {
	this.results.style.display = 'none';
	this.selectedIndex = -1;
};
