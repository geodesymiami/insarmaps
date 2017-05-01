function ThirdPartySourcesController(map) {
    this.map = map;
    this.cancellableAjax = new CancellableAjax();

    this.addGPSStationMarkers = function(stations) {
        var features = [];
        showLoadingScreen("Getting UNR GPS Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/unr",
            success: function(response) {
                var features = this.parseUNR(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

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
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            gpsStationsToggleButton.click();
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

    this.parseIGS08Stations = function(stations) {
        var latLongs = stations.split("\n");

        var latLongMap = {};

        for (var i = 0; i < latLongs.length; i++) {
            var fields = latLongs[i].match(/\S+/g);
            // var fields = latLongs[i];

            if (fields) {
                var station = fields[0];
                var lat = fields[1];
                var long = fields[2];
                var type = "IGS08";

                latLongMap[station] = {
                    "coordinates": [long, lat],
                    "type": type
                };
            }
        }

        return latLongMap;
    };

    this.parseUNR = function(IGS08Stations) {
        var latLongMap = this.parseIGS08Stations(IGS08Stations);
        var features = [];

        for (var station in latLongMap) {
            if (latLongMap.hasOwnProperty(station)) {
                var stationInfo = latLongMap[station];
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
                        "stationName": station,
                        "popupHTML": popupHTML
                    }
                };

                features.push(feature);
            }
        }

        return features;
    };

    // latLongs is just the above gps stations...
    // ask him if these are stationary or we should always
    // request from server. either way, in below function
    // we use the one given to us by server
    this.parseMidasJSON = function(midasJSON) {
        var midas = midasJSON.midas.split("\n");
        var latLongMap = this.parseIGS08Stations(midasJSON.stationLatLongs);

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
        showLoadingScreen("Getting USGS Earthquake Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/USGSMonthlyFeed",
            success: function(response) {
                var featureCollection = response;

                // need to extract depth from 3rd coordinate and put into properties
                // because mapbox ignores 3rd parameter and retunrs only lat and long
                // in queryRenderedFeatures
                featureCollection.features.forEach(function(feature) {
                    var depth = feature.geometry.coordinates[2];
                    feature.properties["depth"] = depth;
                });

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: featureCollection
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
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            usgsEarthquakeToggleButton.click();
        });
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
            // explanation of these indices: http://www.rsmas.miami.edu/personal/glin/Hawaii.html
            // that link is actually wrong, she sent an email with correct indices
            // maybe she'll update the link in the future.
            var lng = attributes[8]
            var lat = attributes[7];
            var mag = parseFloat(attributes[10]);
            var depth = parseFloat(attributes[9]);
            var coordinates = [lng, lat];

            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coordinates
                },
                "properties": {
                    "depth": depth,
                    "mag": mag
                }
            };

            features.push(feature);
        });

        return features;
    };

    this.removeHawaiiReloc = function() {
        var name = "HawaiiReloc";

        this.map.removeSourceAndLayer(name);
    };

    this.featureToViewOptions = function(feature) {
        var layerID = feature.layer.id;
        var layerSource = feature.layer.source;
        var markerSymbol = feature.properties["marker-symbol"];
        var itsAnreaPolygon = (markerSymbol === "fillPolygon");
        var itsAPoint = (layerSource === "vector_layer_" || layerSource === "onTheFlyJSON");
        var itsAGPSFeature = (layerID === "gpsStations");
        var itsAMidasGPSFeature = (layerID === "midas");
        var itsAnUSGSFeature = (layerID === "USGSEarthquake");
        var itsAnIGEPNFeature = (layerID === "IGEPNEarthquake");
        var itsAHawaiiRelocFeature = (layerID === "HawaiiReloc");
        var cursor = (itsAPoint || itsAnreaPolygon ||
            itsAGPSFeature || itsAMidasGPSFeature ||
            itsAnUSGSFeature || itsAnIGEPNFeature ||
            itsAHawaiiRelocFeature) ? 'pointer' : 'auto';

        // a better way is to have two mousemove callbacks like we do with select area vs select marker
        var html = null;
        var coordinates = feature.geometry.coordinates;
        if (itsAGPSFeature) {
            html = feature.properties.stationName;
        } else if (itsAMidasGPSFeature) {
            var velocityInCMYR = (feature.properties.v * 100).toFixed(4);
            var uncertainty = (feature.properties.u * 100).toFixed(4);
            var html = feature.properties.stationName + "<br>" +
                    velocityInCMYR + " +- " + uncertainty + " cm/yr"; // we work in cm. convert m to cm
        } else if (itsAnIGEPNFeature) {
            var props = feature.properties;
            html = "ID: " + props.id + "<br>Mag: " + props.mag + "<br>Depth: " +
                props.depth + "<br>" + props.date + " TU<br>" + props.location;
        } else if (itsAnUSGSFeature) {
            var props = feature.properties;
            html = "Mag: " + props.mag + "<br>Depth: " + props.depth + "<br>" + new Date(props.time) +
                "<br>" + props.title;
        } else if (itsAHawaiiRelocFeature) {
            var props = feature.properties;
            html = "Mag: " + props.mag + "<br>Depth: " + props.depth;
        } else {
            return null;
        }

        var featureViewOptions = {
            "html": html,
            "cursor": cursor,
            "coordinates": coordinates
        };

        return featureViewOptions;
    };
}
