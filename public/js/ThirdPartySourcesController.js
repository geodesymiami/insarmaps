function ThirdPartySourcesController(map) {
    this.map = map;
    this.cancellableAjax = new CancellableAjax();
    this.layerOrder = ["IRISEarthquake", "HawaiiReloc", "IGEPNEarthquake", "USGSEarthquake", "midas",
        "midas-arrows", "gpsStations"
    ];

    this.seismicities = ["IRISEarthquake", "HawaiiReloc", "IGEPNEarthquake", "USGSEarthquake"];

    this.stopsCalculator = new MapboxStopsCalculator();
    this.currentSeismicityStops = this.stopsCalculator.getDepthStops(0, 50, this.map.colorScale.jet);;
    this.currentSeismicityColoring = "depth";

    this.getLayerOnTopOf = function(layer) {
        for (var i = this.layerOrder.length - 1; i >= 0; i--) {
            if (this.layerOrder[i] === layer) {
                var j = i - 1;
                while (!this.map.map.getLayer(this.layerOrder[j]) && j > -1) {
                    j--;
                }

                return j == -1 ? null : this.layerOrder[j];
            }
        }

        return null;
    };

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
                var before = this.getLayerOnTopOf(layerID);
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": "blue",
                        "circle-radius": 5
                    }
                }, before);
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
                "property": 'v',
                "stops": stops
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
                var lat = parseFloat(fields[1]);
                var long = parseFloat(fields[2]);
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

    this.vectorSum = function(vec1, vec2) {
        var x = vec1.x + vec2.x;
        var y = vec1.y + vec2.y;
        var magnitude = Math.sqrt(x * x + y * y);
        const RAD_TO_ANGLE = 180 / Math.PI;
        var angle = ((Math.atan2(y, x)) % (2 * Math.PI)) * RAD_TO_ANGLE;

        var retVector = {
            x: x,
            y: y,
            mag: magnitude,
            angle: angle
        };

        return retVector;
    };

    this.getArrowGeoJSON = function(startCoordinate, orientation, length) {
        const DEG_TO_RAD = Math.PI / 180.0;
        orientation *= DEG_TO_RAD
        var head = {
            lng: startCoordinate[0] + (length * Math.cos(orientation)),
            lat: startCoordinate[1] + (length * Math.sin(orientation))
        };

        const TIP_LENGTH = 0.04;
        const TIP_ANGLE_OFFSET = 160 * DEG_TO_RAD;
        const LEFT_TIP_ANGLE = orientation - TIP_ANGLE_OFFSET;
        const RIGHT_TIP_ANGLE = orientation + TIP_ANGLE_OFFSET;

        var leftTip = {
            lng: head.lng + (TIP_LENGTH * Math.cos(LEFT_TIP_ANGLE)),
            lat: head.lat + (TIP_LENGTH * Math.sin(LEFT_TIP_ANGLE))
        };

        var rightTip = {
            lng: head.lng + (TIP_LENGTH * Math.cos(RIGHT_TIP_ANGLE)),
            lat: head.lat + (TIP_LENGTH * Math.sin(RIGHT_TIP_ANGLE))
        };

        // head is included twice since we need to back track
        // an alternative is to use multi line string but not sure
        // if gl js supports this
        var arrowCoordinates = [
            startCoordinate, [head.lng, head.lat],
            [leftTip.lng, leftTip.lat],
            [head.lng, head.lat],
            [rightTip.lng, rightTip.lat]
        ];

        var arrowFeature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": arrowCoordinates
            },
            "properties": {}
        };

        return arrowFeature;
    };

    this.parseMidasJSON = function(midasJSON) {
        var midas = midasJSON.midas.split("\n");
        var latLongMap = this.parseIGS08Stations(midasJSON.stationLatLongs);

        var features = { "points": [], "arrows": [] };
        for (var i = 0; i < midas.length; i++) {
            var fields = midas[i].match(/\S+/g);
            if (fields) {
                var station = fields[0];
                var stationInfo = latLongMap[station];
                if (stationInfo) {
                    var coordinates = stationInfo.coordinates;
                    var type = stationInfo.type;
                    var popupHTML = '<h3>Station: ' + station + '<br/>' +
                        ' <a target="_blank" href="http://geodesy.unr.edu/NGLStationPages/stations/' + station + '.sta"> ' +
                        ' <img src="http://geodesy.unr.edu/tsplots/' + type + '/TimeSeries/' + station + '.png" align="center" width=400 height=600 alt="' + station + 'Time Series Plot"/> </a>' +
                        ' <p> <h5> Click plot for full station page. Positions in ' + type + ' reference frame. ';

                    // these numbers come from unr midas readme
                    var upVelocity = parseFloat(fields[10]);
                    var northVelocity = {
                        x: 0,
                        y: parseFloat(fields[9])
                    };
                    var eastVelocity = {
                        x: parseFloat(fields[8]),
                        y: 0
                    };
                    var resultant = this.vectorSum(northVelocity, eastVelocity);
                    // make sure we only use positive angles as our data driven-styles only handles positive angles
                    if (resultant.angle < 0) {
                        resultant.angle += 360;
                    }

                    // mapbox only allows clockwise rotations. this math
                    // gives us the angle to rotate by to achieve same angle as unit
                    // circle angle that vector math gives us
                    var mapboxRotateBy = 360 + 90 - resultant.angle;
                    // column 14 according to Midas readme
                    var uncertainty = parseFloat(fields[13]);
                    var stationName = fields[0];

                    var feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": coordinates
                        },
                        "properties": {
                            "v": upVelocity,
                            "u": uncertainty,
                            "mag": resultant.mag,
                            "angle": mapboxRotateBy,
                            "stationName": stationName,
                            "popupHTML": popupHTML
                        }
                    };

                    features.points.push(feature);
                    var arrowLength = resultant.mag * 4;
                    features.arrows.push(this.getArrowGeoJSON(coordinates, resultant.angle, arrowLength));
                }
            }
        }

        return features;
    };


    this.loadmidasGpsStationMarkers = function(loadVelocityArrows) {
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
                        "features": []
                    }
                };

                if (loadVelocityArrows) {
                    var layerID = "midas-arrows";
                    mapboxStationFeatures.data.features = features.arrows;
                    this.map.map.addSource(layerID, mapboxStationFeatures);
                    var before = this.getLayerOnTopOf(layerID);
                    this.map.map.addLayer({
                        "id": layerID,
                        "type": "line",
                        "source": layerID,
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        "paint": {
                            "line-color": "#000",
                            "line-width": 2
                        },
                        "icon-allow-overlap": true
                    }, before); // make sure arrow comes under the circle
                } else {
                    var layerID = "midas";
                    mapboxStationFeatures.data.features = features.points;
                    this.map.map.addSource(layerID, mapboxStationFeatures);
                    var stops = this.map.colorScale.getMapboxStops();
                    var before = this.getLayerOnTopOf(layerID);
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
                    }, before);
                }

                this.map.colorScale.setTitle("Vertical Velocity cm/yr");
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            if (loadVelocityArrows) {
                midasEastNorthStationsToggleButton.click();
            } else {
                midasStationsToggleButton.click();
            }
        });
    };

    this.removemidasGpsStationMarkers = function(removeArrows) {
        var name = "midas";

        if (removeArrows) {
            name += "-arrows";
        }
        this.map.removeSourceAndLayer(name);
    };

    this.midasLoaded = function() {
        return this.map.map.getSource("midas") && this.map.map.getLayer("midas");
    };

    this.setupColorScaleForSeimicities = function() {
        this.map.colorScale.show();
        this.map.colorScale.setTitle("Depth (Km)");
        this.map.colorScale.setMinMax(0, 50);
    };

    this.loadUSGSEarthquakeFeed = function() {
        this.setupColorScaleForSeimicities();
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

                var colors = this.map.colorScale.jet;
                var opacities = [0.2, 0.6, 1.0];
                var opacityStops = this.stopsCalculator.calculateStops(1, 10, opacities, 4.5, 1);

                var layerID = "USGSEarthquake";
                var before = this.getLayerOnTopOf(layerID);
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-opacity": {
                            "property": 'mag',
                            "stops": opacityStops
                        },
                        "circle-color": "red",
                        "circle-radius": 5
                    }
                }, before);

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
        this.setupColorScaleForSeimicities();
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
                    var milliseconds = new Date($(this).attr("fecha")).getTime();
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
                            "time": milliseconds,
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

                var colors = this.map.colorScale.jet;
                var depthStops = this.stopsCalculator.getDepthStops(0, 50, colors);
                var magCircleSizes = [5, 7, 9, 11];
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 6, magCircleSizes);

                var layerID = "IGEPNEarthquake";
                var before = this.getLayerOnTopOf(layerID);
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": "depth",
                            "stops": depthStops,
                            "type": "interval"
                        },
                        "circle-radius": {
                            "property": "mag",
                            "stops": magStops,
                            "type": "interval"
                        }
                    }
                }, before);
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
        this.setupColorScaleForSeimicities();
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

                var colors = this.map.colorScale.jet;
                var depthStops = this.stopsCalculator.getDepthStops(0, 50, colors);
                var magCircleSizes = [5, 8, 11, 14, 17, 20];
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 10, magCircleSizes);

                var layerID = "HawaiiReloc";
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": "depth",
                            "stops": depthStops,
                            "type": "interval"
                        },
                        "circle-radius": {
                            "property": "mag",
                            "stops": magStops,
                            "type": "interval"
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
            var year = attributes[1];
            var month = attributes[2];
            var day = attributes[3];
            var hour = attributes[4];
            var minute = attributes[5];
            var second = attributes[6];
            var milliseconds = new Date(year, month, day, hour, minute, second).getTime();

            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coordinates
                },
                "properties": {
                    "depth": depth,
                    "mag": mag,
                    "time": milliseconds
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

    this.parseIRISEarthquake = function(rawData) {
        var lines = rawData.split("\n");
        var features = [];

        // skip first line which name of columns
        for (var i = 1; i < lines.length; i++) {
            var attributes = lines[i].split("|");
            if (attributes && attributes.length > 0 && attributes[0] != "") {
                var lat = attributes[2];
                var long = attributes[3];
                var depth = parseFloat(attributes[4]);
                var mag = parseFloat(attributes[10]);
                var coordinates = [long, lat];
                var milliseconds = new Date(attributes[1]).getTime();

                var feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": coordinates
                    },
                    "properties": {
                        "depth": depth,
                        "mag": mag,
                        "time": milliseconds
                    }
                };

                features.push(feature);
            }
        }

        return features;
    };

    this.loadIRISEarthquake = function() {
        this.setupColorScaleForSeimicities();
        var now = new Date();
        var startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 2);
        var nowString = now.toISOString().split('T')[0];
        var startDateString = startDate.toISOString().split('T')[0];

        showLoadingScreen("Getting IRIS Earthquake Data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/IRISEarthquake/" + startDateString + "/" + nowString,
            success: function(response) {
                var features = this.parseIRISEarthquake(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                var colors = this.map.colorScale.jet;
                var depthStops = this.stopsCalculator.getDepthStops(0, 50, colors);
                var magCircleSizes = [5, 8, 11, 14, 17, 20];
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 10, magCircleSizes);

                var layerID = "IRISEarthquake";
                this.map.map.addSource(layerID, mapboxStationFeatures);
                this.map.map.addLayer({
                    "id": layerID,
                    "type": "circle",
                    "source": layerID,
                    "paint": {
                        "circle-color": {
                            "property": "depth",
                            "stops": depthStops,
                            "type": "interval"
                        },
                        "circle-radius": {
                            "property": "mag",
                            "stops": magStops,
                            "type": "interval"
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
            irisEarthquakeToggleButton.click();
        });
    };

    this.removeIRISEarthquake = function() {
        var name = "IRISEarthquake";

        this.map.removeSourceAndLayer(name);
    };

    this.featureToViewOptions = function(feature) {
        // this is begging to be refactored. maybe a hash map with callbacks?
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
        var itsAnIRISFeature = (layerID === "IRISEarthquake");
        var cursor = (itsAPoint || itsAnreaPolygon ||
            itsAGPSFeature || itsAMidasGPSFeature ||
            itsAnUSGSFeature || itsAnIGEPNFeature ||
            itsAHawaiiRelocFeature || itsAnIRISFeature) ? 'pointer' : 'auto';

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
            var date = new Date(props.time);
            var dateString = date.toDateString() + " " + date.toLocaleTimeString();
            html = "ID: " + props.id + "<br>Mag: " + props.mag + "<br>Depth: " +
                props.depth + "<br>" + dateString + " TU<br>" + props.location;
        } else if (itsAnUSGSFeature) {
            var props = feature.properties;
            html = "Mag: " + props.mag + "<br>Depth: " + props.depth + "<br>" + new Date(props.time) +
                "<br>" + props.title;
        } else if (itsAHawaiiRelocFeature || itsAnIRISFeature) {
            var props = feature.properties;
            html = "Mag: " + props.mag + "<br>Depth: " + props.depth;
            html += "<br><br>lng: " + feature.geometry.coordinates[0] + "<br>lat: " + feature.geometry.coordinates[1];
            html += "<br><br>Time: " + new Date(props.time);
        } else {
            coordinates = null;
            html = null;
        }

        var featureViewOptions = {
            "html": html,
            "cursor": cursor,
            "coordinates": coordinates
        };

        return featureViewOptions;
    };

    this.recolorSeismicitiesOn = function(property, stops, type) {
        this.seismicities.forEach(function(layerID) {
            if (this.map.map.getLayer(layerID)) {
                this.map.map.setPaintProperty(layerID, "circle-color", {
                    "property": property,
                    "stops": stops,
                    "type": type
                });
            }
        }.bind(this));
    };

    this.recolorSeismicities = function(selectedColoring) {
        var stops = null;
        var colors = this.map.colorScale.jet;
        var min = parseFloat(this.map.colorScale.min);
        var max = parseFloat(this.map.colorScale.max);
        var type = "exponential";
        if (selectedColoring === "time") {
            this.map.colorScale.setTitle("Time (years)")
            var now = new Date();
            var maxDate = new Date();
            var minDate = new Date();
            minDate.setFullYear(now.getFullYear() + min);
            maxDate.setFullYear(now.getFullYear() + max);
            var minMilliSecond = minDate.getTime();
            var maxMilliSecond = maxDate.getTime();
            stops = this.stopsCalculator.getTimeStops(minMilliSecond, maxMilliSecond, colors);
            type = "interval"
        } else if (selectedColoring === "depth") {
            this.map.colorScale.setTitle("Depth (Km)");
            stops = this.stopsCalculator.getDepthStops(min, max, colors);
            type = "interval";
        } else {
            throw new Error("Invalid dropdown selection");
        }

        this.currentSeismicityStops = stops;
        this.currentSeismicityColoring = selectedColoring;
        this.map.thirdPartySourcesController.recolorSeismicitiesOn(selectedColoring, stops, type);
    };
}
