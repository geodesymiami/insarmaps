// TODO: adding and removing sources can be greatly refactored...
function ThirdPartySourcesController(map) {
    this.map = map;
    this.cancellableAjax = new CancellableAjax();

    this.layerOrder = ["USGSEarthquake", "USGSEventsEarthquake", "IGEPNEarthquake", "HawaiiReloc", "LongValleyReloc", "midas",
        "midas-arrows", "gpsStations"
    ];

    this.layerOrderToCallbackMap = null;

    this.seismicities = ["USGSEarthquake", "USGSEventsEarthquake", "IGEPNEarthquake", "HawaiiReloc", "LongValleyReloc",
        "japan_seismicity_2005-2006", "japan_seismicity_2007-2008", "japan_seismicity_2009-2010", "japan_seismicity_2011-2012",
        "japan_seismicity_2013-2014", "japan_seismicity_2015"
    ];
    this.gps = ["midas", "midas-arrows", "gpsStations"];

    this.stopsCalculator = new MapboxStopsCalculator();
    // the default
    this.currentSeismicityColorStops = this.stopsCalculator.getDepthStops(0, 50, this.map.seismicityColorScale.jet_r);
    this.currentSeismicityColoring = "depth";
    this.midasArrows = null;
    this.referenceArrow = null;
    this.lastClickedArrow = null;
    this.subtractedMidasArrows = null;
    this.USGSEventsURL = null;
    this.midasArrowPixelsPerMeter = 2500;

    // keep this around for when main map needs features to pass in to create
    // the seismicity sliders. notice (below) that we always set this before
    // calling mapcontroller methods which change layers and depend on having the
    // latest feature (seismicity or otherwise)
    this.currentFeatures = null;

    this.USGSEventsOptionsController = new USGSEventsOptionsController("USGSEvents-options");
    this.USGSEventsOptionsController.onEnterKeyUp(function(url) {
        this.USGSEventsURL = url;
    }.bind(this));

    this.defaultCircleSizes = [1.25, 2, 4.5, 8, 12.5, 18, 24.5, 32, 40.5, 48.5];
    this.shrunkCircleSizes = [1.5, 2, 4, 6, 9, 12, 16, 20, 24, 28];

    this.currentSeismicitySizeStops = this.stopsCalculator.getMagnitudeStops(1, 11, this.defaultCircleSizes);

    this.addGPSStationMarkers = function(stations) {
        var features = [];
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
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
                var before = this.map.getLayerOnTopOf(layerID);
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

            for (var i = 0; i < this.midasArrows.length; i++) {
                var curArrow = this.midasArrows[i];
                if (curArrow.properties.id == arrow.properties.id) {
                    curArrow.properties.color = "red";
                    curArrow.properties.isReference = true;
                    this.subtractedMidasArrows.push(curArrow);
                } else {
                    var arrowVector = Vector.newVectorFromMagAndAngle(arrow.properties.length, arrow.properties.orientation);
                    var curArrowVector = this.arrowGeoJSONToVector(curArrow);
                    var resultVector = curArrowVector.subtract(arrowVector);
                    var startCoordinate = curArrow.geometry.coordinates[0];
                    var arrowGeoJSON = this.getArrowGeoJSON(startCoordinate, resultVector.angle, resultVector.mag, i);
                    this.subtractedMidasArrows.push(arrowGeoJSON);
                }
            }

            this.map.map.getSource("midas-arrows").setData({
                "type": "FeatureCollection",
                "features": this.subtractedMidasArrows
            });
        }
    };

    this.arrowGeoJSONToVector = function(arrowGeoJSON) {
        var orientation = arrowGeoJSON.properties.orientation;
        var startCoordinate = arrowGeoJSON.geometry.coordinates[0];
        var length = arrowGeoJSON.properties.length;
        var vector = Vector.newVectorFromMagAndAngle(length, orientation);

        return vector;
    };

    this.handleClickOnArrowFeature = function(arrow) {
        // we add the last clicked arrow before subtracting, to undo the
        // effects of the last clicked arrow
        if (this.lastClickedArrow) {
            var lastClickedArrowVector = this.arrowGeoJSONToVector(this.lastClickedArrow);
            var arrowVector = this.arrowGeoJSONToVector(arrow);
            var resultVector = lastClickedArrowVector.add(arrowVector);

            arrow.properties.orientation = resultVector.angle;
            arrow.properties.length = resultVector.mag;
        }

        this.lastClickedArrow = arrow;
        this.subtractArrowMagnitudeFromArrows(arrow);
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
                            "stationName": stationName,
                            "popupHTML": popupHTML
                        }
                    };

                    features.points.push(feature);
                    var arrowLength = resultant.mag * this.midasArrowPixelsPerMeter;
                    // console.log(resultant.mag + " " + arrowLength);
                    features.arrows.push(this.getArrowGeoJSON(coordinates, resultant.angle, arrowLength, i));
                }
            }
        }

        return features;
    };

    // TODO: these load/remove seismicity functions REALLY need to be refactored to one common function
    this.loadmidasGpsStationMarkers = function(loadVelocityArrows) {
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
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
                    var before = this.map.getLayerOnTopOf(layerID);
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
                    var before = this.map.getLayerOnTopOf(layerID);
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

    this.seismicityLoaded = function() {
        return this.getAllSeismicityFeatures().length > 0;
    };

    this.prepareForSeismicities = function(features) {
        this.setupColorScaleForSeismicities();

        if (!features) {
            features = this.currentFeatures;
        }
        // in the future, should call a separate method to create only sliders and not all charts including sliders...
        this.map.seismicityGraphsController.setFeatures(features);
        var mapboxBounds = this.map.map.getBounds();
        this.map.seismicityGraphsController.setBbox([mapboxBounds._sw, mapboxBounds._ne]);
        this.map.seismicityGraphsController.createOrUpdateSliders(features);
        this.map.seismicityGraphsController.showSliders();
    };

    this.setupColorScaleForSeismicities = function() {
        this.map.seismicityColorScale.show();
        this.map.seismicityColorScale.setTitle("Depth (Km)");
        this.map.seismicityColorScale.setMinMax(0, 50); // not necessary, as set features will override it
    };

    this.loadUSGSEarthquakeFeed = function() {
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
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

                this.currentFeatures = featureCollection.features;

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: featureCollection
                };

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

                var layerID = "USGSEarthquake";
                var before = this.map.getLayerOnTopOf(layerID);
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
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
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

                this.currentFeatures = features;

                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

                var layerID = "IGEPNEarthquake";
                var before = this.map.getLayerOnTopOf(layerID);
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
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
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

                this.currentFeatures = features;

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

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

    this.parseLongValleyReloc = function(rawData) {
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
            var year = attributes[0];
            var month = attributes[1];
            var day = attributes[2];
            var hour = attributes[3];
            var minute = attributes[4];
            var second = attributes[5];
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

    this.loadLongValleyReloc = function() {
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
        this.cancellableAjax.ajax({
            url: "/LongValleyReloc",
            success: function(response) {
                var features = this.parseLongValleyReloc(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                this.currentFeatures = features;

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

                var layerID = "LongValleyReloc";
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
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();
                console.log("failed " + xhr.responseText);
            }
        }, function() {
            hideLoadingScreen();
            LongValleyRelocToggleButton.click();
        });
    };

    this.removeLongValleyReloc = function() {
        var layerID = "LongValleyReloc";
        this.map.removeSourceAndLayer(layerID);
    };

    this.removeHawaiiReloc = function() {
        var name = "HawaiiReloc";

        this.map.removeSourceAndLayer(name);
    };

    this.parseUSGSEventsEarthquake = function(rawData) {
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
                var location = attributes[12];

                var feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": coordinates
                    },
                    "properties": {
                        "depth": depth,
                        "mag": mag,
                        "time": milliseconds,
                        "location": location
                    }
                };

                features.push(feature);
            }
        }

        return features;
    };

    this.loadUSGSEventsEarthquake = function() {
        var now = new Date();
        var startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 2);
        var nowString = now.toISOString().split('T')[0];
        var startDateString = startDate.toISOString().split('T')[0];

        showLoadingScreen("Loading data", "ESCAPE to interrupt");

        this.USGSEventsURL = this.USGSEventsOptionsController.getURL();

        this.cancellableAjax.ajax({
            url: "/USGSEventsEarthquake/?url=" + encodeURIComponent(this.USGSEventsURL),
            success: function(response) {
                var features = this.parseUSGSEventsEarthquake(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                this.currentFeatures = features;

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

                var layerID = "USGSEventsEarthquake";
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
                this.map.seismicityColorScale.setTopAsMax(false);
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();

                // don't do the below if error is due to pressing escape key
                if (xhr.responseText) {
                    USGSEventsEarthquakeToggleButton.click();
                    window.alert("Bad USGSEvents parameters. Here's the server's response:\n" + xhr.responseText);
                }
            }
        }, function() {
            hideLoadingScreen();
            USGSEventsEarthquakeToggleButton.click();
        });
    };

    this.removeUSGSEventsEarthquake = function() {
        var name = "USGSEventsEarthquake";

        this.map.removeSourceAndLayer(name);
    };

    // documentation: http://www.data.jma.go.jp/svd/eqev/data/bulletin/data/format/hypfmt_e.html
    // NOTE: it was tricky due to how the fact that the documentation is 1 based indexing, and also due to
    // the way substring in js works with up to but not including the endIndex...
    this.parseJapanSeismicity = function(rawData) {
        var lines = rawData.split("\n");
        var features = [];

        for (var i = 0; i < lines.length; i++) {
            // spaces are 0. can't just assume we will get nice numbers like 012 which will return
            // something when parsed... sometimes we can get "   ", etc which will return NaN.
            var attributes = lines[i].split(" ").join("0");
            if (attributes != "") {
                // lat DMS to decimal degrees
                var degrees = parseFloat(attributes.substring(21, 24));
                var minutes = parseFloat(attributes.substring(24, 28));
                var lat = this.map.DMSToDecimalDegrees(degrees, minutes, 0);

                // lat DMS to decimal degrees
                degrees = parseFloat(attributes.substring(32, 36));
                minutes = parseFloat(attributes.substring(36, 40));
                var long = this.map.DMSToDecimalDegrees(degrees, minutes, 0);

                var depth = parseFloat(attributes.substring(44, 49)) / 100.0;
                var mag = parseFloat(attributes.substring(52, 54)); // Magnitude 1 in documentation
                var coordinates = [long, lat];
                var dateStringUpToDay = attributes.substring(1, 9);

                // date
                var date = customDateStringToJSDate(dateStringUpToDay);
                var hour = parseFloat(attributes.substring(9, 11));
                var minute = parseFloat(attributes.substring(11, 13));
                var second = parseFloat(attributes.substring(13, 17));
                // TODO: check if these times are okay... not sure if this is right
                var JAPAN_STANDARD_TIME_OFFSET_FROM_UTC = 9;
                date.setUTCHours(hour - 9);
                date.setUTCMinutes(minute);
                date.setUTCSeconds(second);

                var milliseconds = date.getTime();

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

    this.loadJapanSeismicity = function(dates) {
        showLoadingScreen("Loading data", "ESCAPE to interrupt");
        // why do we have this in public folder yet we have a route for the volcano excel file...
        // TODO: be consistent in this regard
        var url = "/japan_seismicities/japan_seismicity_" + dates + ".txt";

        this.cancellableAjax.ajax({
            url: url,
            success: function(response) {
                var features = this.parseJapanSeismicity(response);
                var mapboxStationFeatures = {
                    type: "geojson",
                    cluster: false,
                    data: {
                        "type": "FeatureCollection",
                        "features": features
                    }
                };

                this.currentFeatures = features;

                var colors = this.map.seismicityColorScale.jet_r;
                var depthStops = this.currentSeismicityColorStops;
                var magStops = this.currentSeismicitySizeStops;

                var layerID = "japan_seismicity_" + dates;
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
                this.map.seismicityColorScale.setTopAsMax(false);
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                hideLoadingScreen();

                // don't do the below if error is due to pressing escape key
                if (xhr.responseText) {
                    this.removeJapanSeismicities(dates);
                    window.alert("Bad Japan Seismicity Dates" + xhr.responseText);
                }
            }
        }, function() {
            hideLoadingScreen();
            this.removeJapanSeismicities(dates);
        }.bind(this));
    };

    this.removeJapanSeismicities = function(dates) {
        var name = "japan_seismicity_" + dates;
        this.map.removeSourceAndLayer(name);
    };

    this.loadedJapanSeismicityDates = function(dates) {
        var name = "japan_seismicity_" + dates;

        return this.map.map.getSource(name) && this.map.map.getLayer(name);
    };

    this.featureToViewOptions = function(feature) {
        // this is begging to be refactored. maybe a hash map with callbacks?
        var layerID = null;
        var layerSource = null;
        if (feature.layer) {
            layerID = feature.layer.id;
            layerSource = feature.layer.source;
        }
        var itsAPoint = (layerSource === "insar_vector_source" || layerSource === "onTheFlyJSON");
        var itsAGPSFeature = (layerID === "gpsStations");
        var itsAMidasGPSFeature = (layerID === "midas");
        var itsAMidasHorizontalArrow = (layerID === "midas-arrows");
        var itsAMiniMapFeature = (layerID === "LatVLongPlotPoints");
        var itsTheReferencePoint = (layerID === "ReferencePoint");
        var itsASeismicityFeature = this.seismicities.includes(layerID) || feature.properties.depth; // all seismicities have depth, right?

        var cursor = (itsAPoint || itsAGPSFeature || itsAMidasGPSFeature ||
            itsASeismicityFeature || itsAMidasHorizontalArrow || itsAMiniMapFeature ||
            itsTheReferencePoint) ? 'pointer' : 'auto';

        var html = null;
        var coordinates = feature.geometry.coordinates;

        if (itsAGPSFeature) {
            html = feature.properties.stationName;
        } else if (itsAMidasGPSFeature) {
            var velocityInCMYR = (feature.properties.v * 100).toFixed(4);
            var uncertainty = (feature.properties.u * 100).toFixed(4);
            html = feature.properties.stationName + "<br>" +
                velocityInCMYR + " +- " + uncertainty + " cm/yr"; // we work in cm. convert m to cm
        } else if (itsAMidasHorizontalArrow && feature.properties.isReference) {
            coordinates = feature.geometry.coordinates[0];
            html = "<p>Pseudo-reference station.</p><p>This velocity shown red has been subtracted from the others.</p>";
        } else if (itsTheReferencePoint) {
            html = "Reference Point";
        } else if (itsASeismicityFeature || itsAMiniMapFeature) {
            html = "";
            var props = feature.properties;
            if (props.depth) {
                html += "Depth: " + props.depth + "Km<br>";
            }
            if (props.mag) {
                html += "Mag: " + props.mag + "<br>";
            }
            if (props.time) {
                html += new Date(props.time).toISOString().slice(0, 10) + "<br>";
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

    this.modifySeismicitiesPaintProperty = function(paintAttribute, property, stops, type) {
        this.seismicities.forEach(function(layerID) {
            if (this.map.map.getLayer(layerID)) {
                this.map.map.setPaintProperty(layerID, paintAttribute, {
                    "property": property,
                    "stops": stops,
                    "type": type
                });
            }
        }.bind(this));
    };

    this.recolorSeismicitiesOn = function(property, stops, type) {
        this.currentSeismicityColorStops = stops;
        this.modifySeismicitiesPaintProperty("circle-color", property, stops, type);
    };

    this.resizeSeismicitiesOn = function(property, stops, type) {
        this.currentSeismicitySizeStops = stops;
        this.modifySeismicitiesPaintProperty("circle-radius", property, stops, type);
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
                // we update so callers of this method don't have to worry about whether
                // the seismicity has a filter or not. for example our seismcity sliders
                // set their own filters independent of each other, and without having to check
                // whether there is already a filter on a given layer
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
        var colors = this.map.seismicityColorScale.jet_r;
        var min = this.map.seismicityColorScale.min;
        var max = this.map.seismicityColorScale.max;
        var type = "interval";
        if (selectedColoring === "time") {
            this.map.seismicityColorScale.setTitle("Time-colored")
            stops = this.stopsCalculator.getTimeStops(min, max, colors);
        } else if (selectedColoring === "depth") {
            this.map.seismicityColorScale.setTitle("Depth-colored");
            stops = this.stopsCalculator.getDepthStops(min, max, colors);
        } else {
            throw new Error("Invalid dropdown selection");
        }

        this.currentSeismicityColorStops = stops;
        this.currentSeismicityColoring = selectedColoring;
        this.recolorSeismicitiesOn(selectedColoring, stops, type);
    };

    this.resizeSeismicities = function(operation) {
        var magCircleSizes = null;
        var magCircleSizes = null;

        if (operation === "shrink") {
            magCircleSizes = this.shrunkCircleSizes;
        } else if (operation === "expand") {
            magCircleSizes = this.defaultCircleSizes;
        } else {
            throw new Error("Invalid operation selected");
        }

        var magStops = this.stopsCalculator.getMagnitudeStops(1, 11, magCircleSizes);
        this.resizeSeismicitiesOn("mag", magStops, "interval");
    };

    this.getAllSeismicityFeatures = function() {
        var features = [];

        this.seismicities.forEach(function(seismicityID) {
            var source = this.map.map.getSource(seismicityID);
            if (source) {
                features.pushArray(source._data.features);
            }
        }.bind(this));

        // console.log(features);

        return features;
    };

    this.setVisibilityForSeismicityLayers = function(visibility) {
        this.seismicities.forEach(function(layerID) {
            var layer = this.map.map.getLayer(layerID);
            if (layer) {
                this.map.map.setLayoutProperty(layerID, "visibility", visibility);
            }
        }.bind(this));
    };

    this.hideAllSeismicities = function() {
        this.setVisibilityForSeismicityLayers("none");
    };

    this.showAllSeismicities = function() {
        this.setVisibilityForSeismicityLayers("visible");
    };

    this.removeAll = function(except) {
        if (gpsStationsToggleButton !== except) {
            gpsStationsToggleButton.set("off", true);
        }
        if (midasStationsToggleButton !== except) {
            midasStationsToggleButton.set("off", true);
        }
        if (usgsEarthquakeToggleButton !== except) {
            usgsEarthquakeToggleButton.set("off", true);
        }
        if (IGEPNEarthquakeToggleButton !== except) {
            IGEPNEarthquakeToggleButton.set("off", true);
        }
        if (HawaiiRelocToggleButton !== except) {
            HawaiiRelocToggleButton.set("off", true);
        }
        if (USGSEventsEarthquakeToggleButton !== except) {
            USGSEventsEarthquakeToggleButton.set("off", true);
        }
        if (midasEastNorthStationsToggleButton !== except) {
            midasEastNorthStationsToggleButton.set("off", true);
        }
    };

    this.layerOrderToCallbackMap = {
        "USGS": this.loadUSGSEarthquakeFeed,
        "USGSEvents": this.loadUSGSEventsEarthquake,
        "IGEPNEarthquake": this.loadIGEPNEarthquakeFeed,
        "LinHawaiiReloc": this.loadHawaiiReloc,
        "LinLongValleyReloc": this.loadLongValleyReloc,
        "UNRVerticalMidas": this.loadmidasGpsStationMarkers,
        "UNRHorizontalMidas": this.loadmidasGpsStationMarkers,
        "UNRGPS": this.addGPSStationMarkers
    };

    this.loadSourceFromString = function(sourceName) {
        var callback = this.layerOrderToCallbackMap[sourceName];

        if (!callback) {
            throw new Error("Can't find that third party source (" + sourceName + ")");
        }

        callback = callback.bind(this);

        callback();
    };

    this.populateSeismicityMagnitudeScale = function() {
        var circleHtml = "<ul>";
        var valuesHtml = "<ul>";

        this.currentSeismicitySizeStops.forEach(function(curStop) {
            var curMag = curStop[0];
            var curSizeInPixels = curStop[1];

            // the case numbers were chosen like so because mapbox interval coloring
            // chooses the stop just less than the input
            switch (curMag) {
                case 2:
                    valuesHtml += "<li><span class='magnitude-scale-value'><2</span></li>";
                    circleHtml += "<li><div class='magnitude-scale-circle vertically-aligned' style='height: " + curSizeInPixels +
                        "px; width: " + curSizeInPixels + "px'></div></li>";
                    break;
                case 3:
                    valuesHtml += "<li><span class='magnitude-scale-value'>2-3</span></li>";
                    circleHtml += "<li><div class='magnitude-scale-circle vertically-aligned' style='height: " + curSizeInPixels +
                        "px; width: " + curSizeInPixels + "px'></div></li>";
                    break;
                case 4:
                    valuesHtml += "<li><span class='magnitude-scale-value'>3-4</span></li>";
                    circleHtml += "<li><div class='magnitude-scale-circle vertically-aligned' style='height: " + curSizeInPixels +
                        "px; width: " + curSizeInPixels + "px'></div></li>";
                    break;
                case 5:
                    valuesHtml += "<li><span class='magnitude-scale-value'>4-5</span></li>";
                    circleHtml += "<li><div class='magnitude-scale-circle vertically-aligned' style='height: " + curSizeInPixels +
                        "px; width: " + curSizeInPixels + "px'></div></li>";
                    break;
                case 6:
                    valuesHtml += "<li><span class='magnitude-scale-value'>>5</span></li>";
                    circleHtml += "<li><div class='magnitude-scale-circle vertically-aligned' style='height: " + curSizeInPixels +
                        "px; width: " + curSizeInPixels + "px'></div></li>";
                    break;
                default:
                    break;
            }
        });

        circleHtml += "</ul>";
        valuesHtml += "</ul>";
        $("#magnitude-scale-circles").html(circleHtml);
        $("#magnitude-scale-values").html(valuesHtml);
    };

    this.populateMidasHorizontalArrowScale = function() {
        const CENTIMETERS = 5;
        const DESIRED_PIXELS = CENTIMETERS / 100 * this.midasArrowPixelsPerMeter;

        $("#arrow-length-value").html(CENTIMETERS + " cm/yr");
        $("#arrow-image").css({ "width": DESIRED_PIXELS + "px", "height": "10px" });
    };
}

