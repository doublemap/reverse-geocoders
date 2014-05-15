A reverse geocoder takes a latitude and longitude coordinate and gives you the
(best-guess) address of that location. This library provides easy access to
multiple reverse geocoders under a unified interface. Currently supported are:

* `google` - Google Maps
* `mapquestopen` - MapQuest Open (requires API key)
* `mapquestnominatim` - MapQuest Nominatim (default)

The library is somewhat USA-centric right now, due to our current use cases.

Interface
=========

The `reverseGeocode` function takes a latitude and longitude, along with an
optional service name to override which service is chosen. It returns a Q
promise for the results object.

```javascript
var rg = require('reverse-geocoders');
rg.reverseGeocode(42.04759, -87.67954).then(console.log);
```

will print:

```javascript
{ street_number: '1640',
  street: 'Chicago Avenue',
  city: 'Evanston',
  state: 'Illinois',
  postal_code: '60201',
  country: 'United States of America',
  formatted_address: 'Whole Foods, 1640, Chicago Avenue, South Evanston, Evanston, Cook County, Illinois, 60201, United States of America' }
```

You can override the service that is called by passing in a third argument to
`reverseGeocode`:

```javascript
rg.reverseGeocode(42.04759, -87.67954, 'google').then(console.log);
```

Results are translated into a common format, which is an object containing the
following properties:

* street_number
* street
* city
* state
* postal_code
* country
* formatted_address
