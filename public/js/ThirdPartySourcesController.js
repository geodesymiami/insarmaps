function ThirdPartySourcesController(map) {
    this.map = map;
    this.cancellableAjax = new CancellableAjax();
    this.addGPSStationMarkers = function(stations) {
        var features = [];
        var mapboxStationFeatures = {
            type: "geojson",
            cluster: false,
            data: {
                "type": "FeatureCollection",
                "features": []
            }
        };

        var imageURLs = ["bluSquare", "redSquare"];

        var features = [];
        for (var i = 0; i < stations.length; i++) {
            var popupHTML = '<h3>Station: ' + stations[i][0] + '<br/>' +
                ' <a target="_blank" href="http://geodesy.unr.edu/NGLStationPages/stations/' + stations[i][0] + '.sta"> ' +
                ' <img src="http://geodesy.unr.edu/tsplots/' + stations[i][3] + '/TimeSeries/' + stations[i][0] + '.png" align="center" width=400 height=600 alt="' + stations[i][0] + 'Time Series Plot"/> </a>' +
                ' <p> <h5> Click plot for full station page. Positions in ' + stations[i][3] + ' reference frame. ';

            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [stations[i][2], stations[i][1]]
                },
                "properties": {
                    "popupHTML": popupHTML,
                    "stationName": stations[i][0]
                }
            };

            features.push(feature);
        }
        mapboxStationFeatures.data.features = features;

        var layerID = "gpsStations";
        this.map.map.addSource(layerID, mapboxStationFeatures);
        this.map.map.addLayer({
            "id": layerID,
            "type": "circle",
            "source": layerID,
            "paint": {
                "circle-color": "blue",
                "circle-radius": 5
            }
        });
    };

    this.removeGPSStationMarkers = function() {
        var name = "gpsStations";

        this.map.removeSourceAndLayer(name);
    };

    this.refreshmidasGpsStationMarkers = function() {
        var stops = this.map.colorScale.getMapboxStops();
        if (this.map.map.getLayer("midas")) {
            this.map.map.setPaintProperty("midas", "circle-color", {
                property: 'v',
                stops: stops
            });
        }
    };
    // latLongs is just the above gps stations...
    // ask him if these are stationary or we should always
    // request from server. either way, in below function
    // we use the one given to us by server
    this.parseMidasJSON = function(midasJSON) {
        var midas = midasJSON.midas.split("\n");
        // TODO: llh stationLatLongs doesn't have 4th field needed to get
        // plot picture... ask him what to do
        // var latLongs = midasJSON.stationLatLongs.split("\n");
        var latLongs = gpsStations;

        var latLongMap = {};

        for (var i = 0; i < latLongs.length; i++) {
            // var fields = latLongs[i].match(/\S+/g);
            var fields = latLongs[i];

            if (fields) {
                var station = fields[0];
                var lat = fields[1];
                var long = fields[2];
                var type = fields[3];

                latLongMap[station] = {
                    "coordinates": [long, lat],
                    "type": type
                };
            }
        }

        var features = [];
        for (var i = 0; i < midas.length; i++) {
            var fields = midas[i].match(/\S+/g);
            if (fields) {
                var station = fields[0];
                // column 11 according to Midas readme
                var upVelocity = parseFloat(fields[10]);
                // column 14 according to Midas readme
                var uncertainty = parseFloat(fields[13]);
                var stationName = fields[0];
                var stationInfo = latLongMap[station];
                if (stationInfo) {
                    var coordinates = stationInfo.coordinates;
                    var type = stationInfo.type;
                    var popupHTML = '<h3>Station: ' + station + '<br/>' +
                        ' <a target="_blank" href="http://geodesy.unr.edu/NGLStationPages/stations/' + station + '.sta"> ' +
                        ' <img src="http://geodesy.unr.edu/tsplots/' + type + '/TimeSeries/' + station + '.png" align="center" width=400 height=600 alt="' + station + 'Time Series Plot"/> </a>' +
                        ' <p> <h5> Click plot for full station page. Positions in ' + type + ' reference frame. ';


                    var feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": coordinates
                        },
                        "properties": {
                            "v": upVelocity,
                            "u": uncertainty,
                            "stationName": stationName,
                            "popupHTML": popupHTML
                        }
                    };

                    features.push(feature);
                }
            }
        }

        return features;
    };


    this.loadmidasGpsStationMarkers = function() {
        showLoadingScreen("Getting Midas GPS Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/midas",
            success: function(response) {
                var features = this.parseMidasJSON(response);

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                var layerID = "midas";
                var stops = this.map.colorScale.getMapboxStops();
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": 'v',
                            "stops": stops
                        },
                        "circle-radius": 5
                    }
                });

                this.map.colorScale.setTitle("Vertical Velocity cm/yr");
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            midasStationsToggleButton.click();
        });
    };

    this.removemidasGpsStationMarkers = function() {
        var name = "midas";

        this.map.removeSourceAndLayer(name);
    };

    this.midasLoaded = function() {
        return this.map.map.getSource("midas") && this.map.map.getLayer("midas");
    };

    this.loadUSGSEarthquakeFeed = function() {
        showLoadingScreen("Getting USGS Data", "");
        var mapboxStationFeatures = {
            type: "geojson",
            cluster: false,
            data: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
        };

        var layerID = "USGSEarthquake";
        this.map.map.addSource(layerID, mapboxStationFeatures);
        this.map.map.addLayer({
            "id": layerID,
            "type": "circle",
            "source": layerID,
            "paint": {
                "circle-opacity": {
                    "property": 'mag',
                    "stops": [
                        [1.0, 0.2],
                        [4.5, 0.6],
                        [9.0, 1.0]
                    ]
                },
                "circle-color": "red",
                "circle-radius": 5
            }
        });
        hideLoadingScreen();
    };

    this.removeUSGSEarthquakeFeed = function() {
        var name = "USGSEarthquake";

        this.map.removeSourceAndLayer(name);
    };

    this.loadIGEPNEarthquakeFeed = function() {
        showLoadingScreen("Getting IGEPN Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/IGEPNEarthquakeFeed",
            success: function(response) {
                var xmlDocument = $.parseXML(response);
                var $xml = $(xmlDocument);
                var markers = $xml.find("marker");
                features = [];
                markers.each(function() {
                    var lng = $(this).attr("lng");
                    var lat = $(this).attr("lat");
                    var coordinates = [lng, lat];
                    var magnitude = parseFloat($(this).attr("mg"));
                    var depth = parseFloat($(this).attr("z"));
                    var id = $(this).attr("eventoid");
                    var date = $(this).attr("fecha");
                    var location = $(this).attr("localizacion");
                    var feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": coordinates
                        },
                        "properties": {
                            "mag": magnitude,
                            "depth": depth,
                            "lat": lat,
                            "lng": lng,
                            "id": id,
                            "date": date,
                            "location": location
                        }
                    };

                    features.push(feature);
                });

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                var stops = this.map.colorScale.getIGEPNMapboxStops(0, 50);

                var layerID = "IGEPNEarthquake";
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": "depth",
                            "stops": stops
                        },
                        "circle-radius": {
                            "property": "mag",
                            "stops": [
                                [4, 5],
                                [4.9, 7],
                                [5.0, 9],
                                [5.9, 11]
                            ]
                        }
                    }
                });
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            IGEPNEarthquakeToggleButton.click();
        });
    };

    this.removeIGEPNEarthquakeFeed = function() {
        var name = "IGEPNEarthquake";

        this.map.removeSourceAndLayer(name);
    };

    this.loadHawaiiReloc = function() {
        showLoadingScreen("Getting Hawaii Reloc Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/HawaiiReloc",
            success: function(response) {
                var features = this.parseHawaiiReloc(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                var stops = this.map.colorScale.getIGEPNMapboxStops(0, 50);

                var layerID = "HawaiiReloc";
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": "depth",
                            "stops": stops
                        },
                        "circle-radius": {
                            "property": "mag",
                            "stops": [
                                [4, 5],
                                [4.9, 7],
                                [5.0, 9],
                                [5.9, 11]
                            ]
                        }
                    }
                });
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            HawaiiRelocToggleButton.click();
        });
    };

    this.parseHawaiiReloc = function(rawData) {
        var pointLines = rawData.split("\n");
        var features = [];
        pointLines.forEach(function(pointLine) {
            var attributes = pointLine.match(/\S+/g);
            // in case empty line (usually last line)
            if (!attributes) {
                return;
            }
            var lng = attributes[8]
            var lat = attributes[7];
            var coordinates = [lng, lat];

            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coordinates
                },
                "properties": {}
            };

            features.push(feature);
        });

        console.log(features);

        return features;
    };

    this.removeHawaiiReloc = function() {
        var name = "HawaiiReloc";

        this.map.removeSourceAndLayer(name);
    };
}
