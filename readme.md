# Omniva-Map

Documentation Draft for Version: `1.0.0`

#

## Prerequisites

- jQuery (>=2.0)
- Leaflet (>=1.5.1)

```html
<script src="https://code.jquery.com/jquery-3.4.1.min.js"
  integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.5.1/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.5.1/dist/leaflet.js"></script>
```

#

## Installation

- Download and extract plugin (omniva-map.v1.0.0.zip) files.
- Upload to server `omniva-map.css`, `omniva-map.min.js` and images folder.
- Remember path to images on the server as it will be needed to add in settings object (ex. `https://mywebsite/image/omniva/`).
- Add omniva-map.css and omniva-map.min.js to document head tag
Example:
```html
<link rel="stylesheet" href="omniva-map.css">
<script src="omniva-map.js" defer></script>
```

#

## Usage

It should be hooked up onto HTMLElement.

Example:
```js
// omniva_ready can later be used to trigger custom events
var omniva_ready = $('#element').omniva({
	terminals: [
		["Alytaus NORFA","54.396616","24.028241","88895","Alytus","Topolio g. 1, Alytus","Description"]
	],
	path_to_img: 'https://www.test.com/image/omniva/'
});
```
There **must** be terminal array and path to images passed in settings object. Normally it is made by Omniva module and put into template. In current version it must be in a format of array of terminal information arrays, where terminal information is in this sequence:

	[
		"Title",
		"Latitude",
		"Longitude",
		"ID/Postal Code",
		"City",
		"Address",
		"Description"
	]

By default it will create selection and modal html in HTMLElement it is beeing hooked up to parent.

```html
<div class="parent">
	<input type="radio" id="hook_element"/>
</div>
```

will create:

```html
<div class="parent">
	<input type="radio" id="hook_element"/>
	<div class="omniva-terminal-container"></div>
</div>
```

#

## Events

In order to customize logic omniva-map listens for these events on HTMLElement it was started.

- `omniva.show` - (Listens) - Shows Omniva html container.

- `omniva.hide` - (Listens) - Hides Omniva html container.

- `omniva.update.settings` - (Listens) - Work In Progress: Updates initialy set settings. Must have settings object attached.
	Usage, when triggereing add into data array new settings object: 
	```js
	$('#element_with_omniva').trigger('omniva.postcode', [ { callback: function (id) { console.log(id); } } ])
	```

- `omniva.postcode` - (Listens) - Initiates search by supplied postcode and sorts terminals by distance from this location.
	Usage, when triggereing add into data array post code to be used for searching nearby terminals: 
	```js
	$('#element_with_omniva').trigger('omniva.postcode', [ '98754' ])
	```

#

## Settings Object

default:
```js
{
	autoHide: false,
  maxShow: 8,
  showMap: true,
  country_code: 'LT',
  terminals: [],
  path_to_img: 'image/omniva/',
  selector_container: false,
  callback: false,
  translate: {
    modal_header: 'Omniva terminals',
    search_bar_title: 'Omniva addresses',
    search_bar_placeholder: 'Enter postcode/address',
    search_back_to_list: 'Back to list',
    select_terminal: 'Choose terminal',
    show_on_map: 'Show on map',
    show_more: 'Show more',
    place_not_found: 'Place not found'
  }
}
```

- `autoHide` - true or false, if set to true created html container will be hidden (to show use `omniva.show` event).
- `maxShow` - number of terminals to show in dropdown when searching by address / post code.
- `showMap` - DEPRECATED. Should be left as true.
- `country_code` - LT, LV, EE - used in queries when searching by address / post code.
- `terminals` - Omniva terminals array. REQUIRED.
- `path_to_img` - url where omniva images is located. REQUIRED.
- `selector_container` - to place Omniva html container in a custom place. Accepts HTMLElement or #id. example

	```js
	{
		selector_container: '#element_id'
	}
	```

	or

	```js
	{
		selector_container: $('#element_id')[0]
  }
  ```

- `callback` - function to call when terminal is selected, supplies terminal `id` (post code). Should be used when shop module expects different shipping code format than just post code. Example:

  ```js
  {
	  callback: function(id) {
	    console.log('Selected terminal ID:', id);
		  $('#omniva_parcel_radio').val('omnivalt.parcel_terminal_' + id);
	  }
  }
  ```

- `translate` - Object with translation strings for these strings:
	- `modal_header` -  Map modal header,
  - `search_bar_title`: Map modal search input title,
  - `search_bar_placeholder`: Search inputs placeholder,
  - `search_back_to_list`: Button to return to terminal list,
  - `select_terminal`: Button to select terminal,
  - `show_on_map`: Show map modal button,
  - `show_more`: Button in dropdown to show the rest of terminal list above set `maxShow`,
  - `place_not_found`: search result if no place could be found.

#

## Example of JavaScript part in OpenCart 3.0 shipping_method template

parts in `{{ }}` comes from TWIG template

```js
$(document).ready(function () {
  var omnivaModuleReady = false;
  var first_time = true;
  omnivaModuleReady = $('#omniva_terminal').omniva({
    autoHide: false,
    country_code: "{{ omniva_country }}",
    path_to_img: 'image/omniva/',
    callback: function (id) { // opencart needs specific method code
      if (first_time) { // we will trigger search by post code so ignore first callback
        first_time = false;
        omnivaModuleReady.val('omnivalt.parcel_terminal_' + id);
      } else {
        omnivaModuleReady.val('omnivalt.parcel_terminal_' + id).prop('checked', true);
      }

		  // trigger change event if it is selected shipping method
      if (omnivaModuleReady.is(':checked')) {
        omnivaModuleReady.trigger('change');
      }
    },
    translate: {{ omniva_map_translation|json_encode() }},
    terminals: {{ omniva_locations|json_encode() }}
  });
	// with default template this should be enough even if user changes postcode (as he needs to press continue button)
  var sameShipping = $('input[name="shipping_address"]');
  if (sameShipping.length > 0 && sameShipping.is(':checked')) {
    omnivaModuleReady.trigger('omniva.postcode', [$('#input-payment-postcode').val()]);
  } else {
    omnivaModuleReady.trigger('omniva.postcode', [$('#input-shipping-postcode').val()]);
  }
	
	// example of using events to hide/show omniva html
	$('#collapse-shipping-method').on('click', 'input[type="radio"][name="shipping_method"]', function (e) {
		if (omnivaModuleReady) {
			if ($(this).is(omnivaModuleReady)) {
        omnivaModuleReady.trigger('omniva.show');
      } else {
        omnivaModuleReady.trigger('omniva.hide');
      }
    }
	});  
});
```