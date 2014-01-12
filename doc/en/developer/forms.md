## Forms

### Rendering HTML forms

HTML forms can be generated using Magnode's built-in rendering, transform, and formatting tools.

Forms are generated according to a JSON Schema. The JSON Schema also contains a `value` property providing the value of the instance to use in the form.

	var targetType = 'http://magnode.org/HTMLBodyField';
	var input = Object.create(resources);
	// The object, including its value (in the `value` property) is described using a JSON Schema
	input['http://magnode.org/field/object'] = Object.create(formSchema);
	input['http://magnode.org/field/object'].value = query;
	var transformTypes = ['http://magnode.org/view/PutFormTransform'];
	render.render(targetType, input, transformTypes, function(err, res){
		var formHTML = res[targetType];
	});

The appropriate formatting/transform functions must be imported into `render`, which is done by default by `httpd.js`.

The relevant functions are found in `lib/transform.HTMLBodyField_type*.js`, and `lib/widget.*.js` which are imported using `scan.widget`.

### Parsing application/x-www-form-urlencoded

The submissions of forms generated as above can also be parsed back into objects:

	// Let `query` be a key-value object map of form names and their string values
	var query = {name: "value"};
	// It is usually uploaded in a request-entity-body:
	var query = querystring.parse(data);
	// It might also be supplied from the URL:
	var query = url.parse(resources.request.url, true).query;
	// We want to render the input an arbritrary value
	var targetType = 'http://magnode.org/FieldValue';
	var input = {};
	// We can optionally provide a schema to render and validate against
	input['http://magnode.org/fieldpost/Object'] = Object.create(formSchema);
	// We want to render the root key, so set name to empty string
	input['http://magnode.org/fieldpost/Object'].name = '';
	// The form data itself is provided seperately
	input['http://magnode.org/FormFieldData'] = query;
	// The transforms are registered
	transformTypes = ['http://magnode.org/view/FormDataTransform'];
	render.render(targetType, input, transformTypes, function(err, res){
		var value = res[targetType];
	});

The appropriate formatting/transform functions must be imported into `render`, which is done by default by `httpd.js`.

The relevant functions are found in `lib/transform.Field_type*.js`, and `lib/widget.*.js` which are imported using `scan.widget`.

