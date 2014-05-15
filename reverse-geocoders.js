var http = require('http');
var sprintf = require('sprintf').sprintf;
var request = require('request');
var _ = require('underscore');
var Q = require('q');

/*
 * Given a lat, lon, returns:
   a Q promise that could give:
   {
      "address": "238 Deacon St",
      "city": "Indianapolis",
      "state": "IN",
      "postal_code": "46202",
      "country": "USA",
      ...
   }
 */
var reverseGeocode = function(lat, lon, service) {
    if (service === undefined && process.env.REVERSE_GEOCODING_SERVICE) {
        service = process.env.REVERSE_GEOCODING_SERVICE;
    }
    switch(service) {
        case "google":
            return reverseGeocodeGoogle(lat, lon);
        case "mapquestopen": // requires API key
            return reverseGeocodeMapquestOpen(lat, lon);
        // tamu reverse-geocoding services is currently broken
        //case "tamu": // requires API key
        //    reverseGeocodeTAMU(lat, lon, callback);
        case "mapquestnominatim":
        default:
            return reverseGeocodeMapquestNominatim(lat, lon);
    }
}

var reverseGeocodeMapquestOpen = function(lat, lon) {
    var deferred = Q.defer();
    var url = sprintf("http://open.mapquestapi.com/geocoding/v1/reverse?key=%s&location=%f,%f", process.env.MAPQUEST_OPEN_KEY, lat, lon);
    //console.log(url);
    request(url, function(error, response, body) {
        if(error) {
            deferred.reject(error);
        } else {
            var dat = JSON.parse(body);
            var pt = dat.results[0].locations[0];
            var results = {};
            if(pt.street)
                results.street = pt.street;
            if(pt.adminArea5)
                results.city = pt.adminArea5;
            if(pt.adminArea3)
                results.state = pt.adminArea3;
            if(pt.postalCode)
                results.postal_code = pt.postalCode;
            if(pt.adminArea1)
                results.country = pt.adminArea1;
            deferred.resolve(results);
        }
    });
    return deferred.promise;
}

var reverseGeocodeMapquestNominatim = function(lat, lon) {
    var deferred = Q.defer();
    var url = sprintf("http://open.mapquestapi.com/nominatim/v1/reverse?format=json&lat=%f&lon=%f", lat, lon);
    request(url, function(error, response, body) {
        if(error) {
            deferred.reject(error);
        } else {
            var dat = JSON.parse(body);
            var pt = dat.address;
            var results = {};
            if(pt.house_number)
                results.street_number = pt.house_number;
            if(pt.road)
                results.street = pt.road;
            if(pt.city)
                results.city = pt.city;
            if(pt.state)
                results.state = pt.state;
            if(pt.postcode)
                results.postal_code = pt.postcode;
            if(pt.country)
                results.country = pt.country;
            if(dat.display_name)
                results.formatted_address = dat.display_name;

            deferred.resolve(results);
        }
    });
    return deferred.promise;
}


var reverseGeocodeTAMU = function(lat, lon, callback) {
    var url = sprintf("http://geoservices.tamu.edu/Services/ReverseGeocoding/WebService/v04_01/HTTP/default.aspx?apiKey=%s&version=4.01&lat=%f&lon=%f&format=json",
        process.env.TAMU_GEOSERVICES_KEY, lat, lon);

    request(url, function(error, response, body) {
        if(error) {
            console.log(error);
            callback(error);
        } else {
            callback(body);
        }
    });
};

var reverseGeocodeGoogle = function(lat, lon) {
    var deferred = Q.defer();
    var url = sprintf("http://maps.googleapis.com/maps/api/geocode/json?latlng=%f,%f&sensor=false", lat, lon);
    //console.log(url);
    request(url, function(error, response, body) {
        if(error) {
            console.log(error);
            deferred.reject(error);
        } else {
            var dat = JSON.parse(body);
            if (dat['results'].length == 0) {
                deferred.reject(new Error("No results found."));
            } else {
                var results = {};
                _.each(dat.results[0].address_components, function(comp) {
                    if(comp.types.indexOf("street_number") > -1) {
                        results.street_number = comp.short_name;
                    } else if(comp.types.indexOf("route") > -1) {
                        results.street = comp.short_name;
                    } else if(comp.types.indexOf("locality") > -1) {
                        results.city = comp.short_name;
                    } else if(comp.types.indexOf("administrative_area_level_1") > -1) {
                        results.state = comp.short_name;
                    } else if(comp.types.indexOf("sublocality") > -1 && !("city" in results)) {
                        results.city = comp.short_name;
                    } else if(comp.types.indexOf("transit_station") > -1) {
                        results.place_name = comp.short_name;
                    } else if(comp.types.indexOf("postal_code") > -1) {
                        results.postal_code = comp.short_name;
                    }
                });
                results.formatted_address = dat.results[0].formatted_address;
                deferred.resolve(results);
            }
        }
    });
    return deferred.promise;
}

/*
 * Given a results object, format it into a place (e.g. the first part
 * of the address before city name). Returns "" if not able to format.
 *
 * Examples:
 *
 * 10th @ IU Library, 10th St
 * 758 Bates St
 * Kenwood/Alameda
 */
var format_place = function(results) {
    if (results.place_name && results.street) {
        return sprintf("%s, %s", results.place_name, results.street);
    }
    if (results.street_number && results.street) {
        return sprintf("%s %s", results.street_number, results.street);
    }
    if (results.place_name) {
        return results.place_name;
    }
    if (results.street_number) {
        return sprintf("%s %s", results.street_number, results.street);
    }
    if (results.street) {
        return results.street;
    } else {
        return "";
    }
}

var format_address = function(results) {
    if(results.formatted_address) {
        return results.formatted_address;
    }

    var place = format_place(results);
    if(place !== "")
        return sprintf("%s, %s, %s", format_place(results), results.city, results.state);
    else
        return sprintf("%s, %s", results.city, results.state);
}

module.exports = {
    //reverseGeocodeTAMU: reverseGeocodeTAMU,
    reverseGeocodeGoogle: reverseGeocodeGoogle,
    reverseGeocodeMapquestOpen: reverseGeocodeMapquestOpen,
    reverseGeocodeMapquestNominatim: reverseGeocodeMapquestNominatim,
    reverseGeocode: reverseGeocode,
    format_place: format_place,
    format_address: format_address
};
