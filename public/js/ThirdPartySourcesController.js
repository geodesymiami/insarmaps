function ThirdPartySourcesController(map) {
    this.map = map;
    this.cancellableAjax = new CancellableAjax();
    this.layerOrder = ["IRISEarthquake", "HawaiiReloc", "IGEPNEarthquake", "USGSEarthquake", "midas",
        "midas-arrows", "gpsStations"
    ];

    this.seismicities = ["IRISEarthquake", "HawaiiReloc", "IGEPNEarthquake", "USGSEarthquake"];
    this.gps = ["midas", "midas-arrows", "gpsStations"];

    this.stopsCalculator = new MapboxStopsCalculator();
    // the default
    this.currentSeismicityColorStops = this.stopsCalculator.getDepthStops(0, 50, this.map.colorScale.jet_r);
    this.currentSeismicityColoring = "depth";
    this.midasArrows = null;
    this.referenceArrow = null;
    this.subtractedMidasArrows = null;

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
                this.map.addSource(layerID, mapboxStationFeatures);
                this.map.addLayer({
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

    // arrow is in pixels... we convert to appropriate delta degree by using mapbox
    // functions
    // we need an id to identify arrows since we need to manipulate them. can't stringify
    // coordinates as gl js returned feature from queryrendered feature doesn't maintain exact
    // cords
    this.getArrowGeoJSON = function(startCoordinate, orientation, length, id) {
        const DEGREE_PER_PIXEL = this.map.calculateDegreesPerPixelAtCurrentZoom(startCoordinate[1]);

        var lengthInPixels = length;
        length *= DEGREE_PER_PIXEL;

        var headVector = Vector.newVectorFromMagAndAngle(length, orientation);

        var head = {
            lng: startCoordinate[0] + headVector.x,
            lat: startCoordinate[1] + headVector.y
        };

        const TIP_LENGTH = 5 * DEGREE_PER_PIXEL;
        const TIP_ANGLE_OFFSET = 160;
        const LEFT_TIP_ANGLE = orientation - TIP_ANGLE_OFFSET;
        const RIGHT_TIP_ANGLE = orientation + TIP_ANGLE_OFFSET;

        var leftTipVector = Vector.newVectorFromMagAndAngle(TIP_LENGTH, LEFT_TIP_ANGLE);

        var leftTip = {
            lng: head.lng + leftTipVector.x,
            lat: head.lat + leftTipVector.y
        };

        var rightTipVector = Vector.newVectorFromMagAndAngle(TIP_LENGTH, RIGHT_TIP_ANGLE);
        var rightTip = {
            lng: head.lng + rightTipVector.x,
            lat: head.lat + rightTipVector.y
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
            "properties": {
                "orientation": orientation,
                "length": lengthInPixels,
                "color": "black",
                "id": id
            }
        };

        return arrowFeature;
    };

    this.updateArrowLengths = function() {
        if (this.midasArrows) {
            var arrowsArray = this.subtractedMidasArrows ? this.subtractedMidasArrows : this.midasArrows;

            for (var i = 0; i < arrowsArray.length; i++) {
                var curArrow = arrowsArray[i];
                var orientation = curArrow.properties.orientation;
                var startCoordinate = curArrow.geometry.coordinates[0];
                var length = curArrow.properties.length;

                var arrowGeoJSON = this.getArrowGeoJSON(startCoordinate, orientation, length, i);
                if (this.referenceArrow && curArrow.properties.id == this.referenceArrow.properties.id) {
                    arrowGeoJSON.properties.color = "red";
                }
                arrowsArray[i] = arrowGeoJSON;
            }

            this.map.map.getSource("midas-arrows").setData({
                "type": "FeatureCollection",
                "features": arrowsArray
            });
        }
    };

    this.subtractArrowMagnitudeFromArrows = function(arrow) {
        if (this.midasArrows) {
            this.referenceArrow = arrow;
            this.subtractedMidasArrows = null;
            this.subtractedMidasArrows = [];
            var arrowVector = Vector.newVectorFromMagAndAngle(arrow.properties.length, arrow.properties.orientation);

            for (var i = 0; i < this.midasArrows.length; i++) {
                var curArrow = this.midasArrows[i];
                var orientation = curArrow.properties.orientation;
                var startCoordinate = curArrow.geometry.coordinates[0];
                var length = curArrow.properties.length;
                var curArrowVector = Vector.newVectorFromMagAndAngle(length, orientation);
                var resultVector = curArrowVector.subtract(arrowVector);

                var arrowGeoJSON = this.getArrowGeoJSON(startCoordinate, resultVector.angle, resultVector.mag, i);
                if (curArrow.properties.id == arrow.properties.id) {
                    curArrow.properties.color = "red";
                    this.subtractedMidasArrows.push(curArrow);
                } else {
                    this.subtractedMidasArrows.push(arrowGeoJSON);
                }
            }

            this.map.map.getSource("midas-arrows").setData({
                "type": "FeatureCollection",
                "features": this.subtractedMidasArrows
            });
        }
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
                    var northVelocity = new Vector(0, parseFloat(fields[9]));
                    var eastVelocity = new Vector(parseFloat(fields[8]), 0);
                    var resultant = northVelocity.add(eastVelocity);
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
                    var arrowLength = resultant.mag * 1000;
                    features.arrows.push(this.getArrowGeoJSON(coordinates, resultant.angle, arrowLength, i));
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
                    this.midasArrows = features.arrows;
                    mapboxStationFeatures.data.features = features.arrows;
                    this.map.addSource(layerID, mapboxStationFeatures);
                    var before = this.getLayerOnTopOf(layerID);
                    this.map.addLayer({
                        "id": layerID,
                        "type": "line",
                        "source": layerID,
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        "paint": {
                            "line-color": {
                                'type': 'identity',
                                'property': 'color'
                            },
                            "line-width": 2
                        },
                        "icon-allow-overlap": true
                    }, before); // make sure arrow comes under the circle
                } else {
                    var layerID = "midas";
                    mapboxStationFeatures.data.features = features.points;
                    this.map.addSource(layerID, mapboxStationFeatures);
                    var stops = this.map.colorScale.getMapboxStops();
                    var before = this.getLayerOnTopOf(layerID);
                    this.map.addLayer({
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
            this.midasArrows = null;
            this.subtractedMidasArrows = null;
            this.referenceArrow = null;
        }
        this.map.removeSourceAndLayer(name);
    };

    this.midasLoaded = function() {
        return this.map.map.getSource("midas") && this.map.map.getLayer("midas");
    };

    this.prepareForSeismicities = function(features) {
        this.setupColorScaleForSeismicities();
        // in the future, should call a separate method to create only sliders and not all charts including sliders...
        this.map.seismicityGraphsController.setFeatures(features);
        var mapboxBounds = this.map.map.getBounds();
        this.map.seismicityGraphsController.setBbox([mapboxBounds._sw, mapboxBounds._ne]);
        this.map.seismicityGraphsController.createAllCharts(this.currentSeismicityColoring, null, null);
        this.map.seismicityGraphsController.showSliders();
    };

    this.setupColorScaleForSeismicities = function() {
        this.map.colorScale.show();
        this.map.colorScale.setTitle("Depth (Km)");
        this.map.colorScale.setMinMax(0, 50);
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
                    feature.properties["location"] = feature.properties.title;
                });

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: featureCollection
                };

                var colors = this.map.colorScale.jet;
                var opacities = [0.2, 0.6, 1.0];
                var opacityStops = this.stopsCalculator.getOpacityStops(1, 10, opacities);

                var layerID = "USGSEarthquake";
                var before = this.getLayerOnTopOf(layerID);
                this.map.addSource(layerID, mapboxStationFeatures);
                this.map.addLayer({
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

                this.prepareForSeismicities(featureCollection.features);

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

    this.defaultCircleSizes = function() {
        return [3, 5, 7, 9];
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
                    var lng = parseFloat($(this).attr("lng"));
                    var lat = parseFloat($(this).attr("lat"));
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

                var colors = this.map.colorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magCircleSizes = this.defaultCircleSizes();
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 6, magCircleSizes);

                var layerID = "IGEPNEarthquake";
                var before = this.getLayerOnTopOf(layerID);
                this.map.addSource(layerID, mapboxStationFeatures);
                this.map.addLayer({
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
                this.map.colorScale.setTopAsMax(false);
                this.prepareForSeismicities(features);
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

                var colors = this.map.colorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magCircleSizes = this.defaultCircleSizes();
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 10, magCircleSizes);

                var layerID = "HawaiiReloc";
                this.map.addSource(layerID, mapboxStationFeatures);
                this.map.addLayer({
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
                this.map.colorScale.setTopAsMax(false);
                this.prepareForSeismicities(features);
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
            var lng = parseFloat(attributes[8]);
            var lat = parseFloat(attributes[7]);
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
                var lat = parseFloat(attributes[2]);
                var long = parseFloat(attributes[3]);
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

                var colors = this.map.colorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magCircleSizes = this.defaultCircleSizes();
                var magStops = this.stopsCalculator.getMagnitudeStops(4, 10, magCircleSizes);

                var layerID = "IRISEarthquake";
                this.map.addSource(layerID, mapboxStationFeatures);
                this.map.addLayer({
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
                this.map.colorScale.setTopAsMax(false);
                this.prepareForSeismicities(features);
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
        if (!feature.layer) {
            return null;
        }
        // this is begging to be refactored. maybe a hash map with callbacks?
        var layerID = feature.layer.id;
        var layerSource = feature.layer.source;
        var itsAPoint = (layerSource === "insar_vector_source" || layerSource === "onTheFlyJSON");
        var itsAGPSFeature = (layerID === "gpsStations");
        var itsAMidasGPSFeature = (layerID === "midas");
        var itsAMidasHorizontalArrow = (layerID === "midas-arrows");
        var itsASeismicityFeature = this.seismicities.includes(layerID);

        var cursor = (itsAPoint || itsAGPSFeature || itsAMidasGPSFeature ||
                    itsASeismicityFeature || itsAMidasHorizontalArrow) ? 'pointer' : 'auto';

        var html = null;
        var coordinates = feature.geometry.coordinates;

        if (itsAGPSFeature) {
            html = feature.properties.stationName;
        } else if (itsAMidasGPSFeature) {
            var velocityInCMYR = (feature.properties.v * 100).toFixed(4);
            var uncertainty = (feature.properties.u * 100).toFixed(4);
            var html = feature.properties.stationName + "<br>" +
                velocityInCMYR + " +- " + uncertainty + " cm/yr"; // we work in cm. convert m to cm
        } else if (itsASeismicityFeature) {
            html = "";
            var props = feature.properties;
            if (props.depth) {
                html += "Depth: " + props.depth + "Km<br>";
            }
            if (props.mag) {
                html += "Mag: " + props.mag + "<br>";
            }
            if (props.time) {
                html += new Date(props.time) + "<br>";
            }
            if (props.location) {
                html += props.location;
            }
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
        this.currentSeismicityColorStops = stops;

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

    // updates conditions in filter with conditions in withFilter.
    // for all those new conditions in withFilter not in filter, we append them
    // to filter.
    this.updateFilter = function(filter, withFilter) {
        // remove all if there
        if (withFilter[0] === "all") {
            withFilter = withFilter.slice(1);
        }

        var notUpdated = [];
        for (var i = 0; i < withFilter.length; i++) {
            var condition = withFilter[i][0];
            var property = withFilter[i][1];
            var updated = false;
            for (var j = 0; j < filter.length; j++) {
                if (filter[j].includes(condition) && filter[j].includes(property)) {
                    filter[j] = withFilter[i];
                    updated = true;
                    break;
                }
            }

            if (!updated) {
                notUpdated.push(i);
            }
        }

        // now, go through all non updated and append them to filter
        notUpdated.forEach(function(indexInWithFilter) {
            filter.push(withFilter[indexInWithFilter]);
        });
    };

    this.filterSeismicities = function(minsAndMaxes, property) {
        var filter = ["all"];
        for (var i = 0; i < minsAndMaxes.length; i++) {
            var min = minsAndMaxes[i].min;
            var max = minsAndMaxes[i].max;

            // can't do if min or if max cause they can be 0 which is evaluated to false
            if (min != null) {
                filter.push([">=", property, min]);
            }

            if (max != null) {
                filter.push(["<=", property, max]);
            }
        }

        this.seismicities.forEach(function(layerID) {
            if (this.map.map.getLayer(layerID)) {
                var curFilter = this.map.map.getFilter(layerID);
                // we update so filter doesn't continually grow when we keep on setting
                if (curFilter) {
                    this.updateFilter(curFilter, filter);
                    this.map.map.setFilter(layerID, curFilter);
                } else {
                    this.map.map.setFilter(layerID, filter);
                }
            }
        }.bind(this));
    };

    this.removeSeismicityFilters = function() {
        this.seismicities.forEach(function(layerID) {
            // if layer not there, mapbox throws exception when getting filter as of version 0.36.0...
            // not sure if bug or it's meant to be like this, so we check the layer is there
            if (this.map.map.getLayer(layerID) && this.map.map.getFilter(layerID)) {
                this.map.map.setFilter(layerID, null);
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
            colors = this.map.colorScale.jet_r;
            this.map.colorScale.setTitle("Depth (Km)");
            stops = this.stopsCalculator.getDepthStops(min, max, colors);
            type = "interval";
        } else {
            throw new Error("Invalid dropdown selection");
        }

        this.currentSeismicityColorStops = stops;
        this.currentSeismicityColoring = selectedColoring;
        this.recolorSeismicitiesOn(selectedColoring, stops, type);
    };

    this.removeAll = function() {
        this.layerOrder.forEach(function(layer) {
            this.map.removeSourceAndLayer(layer);
        }.bind(this));

        gpsStationsToggleButton.set("off");
        midasStationsToggleButton.set("off");
        usgsEarthquakeToggleButton.set("off");
        IGEPNEarthquakeToggleButton.set("off");
        HawaiiRelocToggleButton.set("off");
        irisEarthquakeToggleButton.set("off");
    };
}
