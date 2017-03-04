//tippecanoe geo_timeseries_masked_original.json -pf -pk -Bg -d9 -D7 -g4 -rg -o t.mbtiles
// how to do it with leaflet -
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/

var currentPoint = 1;
var currentArea = null;
var file = "/home/vagrant/code/insar_map_mvc/public/json/geo_timeseries_masked.h5test_chunk_";
var firstToggle = true;
var myPolygon = null;
var areaAttributesPopup = new AreaAttributesPopup();

// take an array of displacement values and return velocity standard deviation (confuses the heck out of me)
var getStandardDeviation = function(displacements, slope) {
    var v_std = 0.0;
    for (i = 0; i < displacements.length; i++) {
        v_std += (Math.abs(slope - displacements[i]) * Math.abs(slope - displacements[i]));
    }
    return Math.sqrt(v_std / (displacements.length - 1));
}

// falk's date string is in format yyyymmdd - ex: 20090817 
var customDateStringToJSDate = function(dateString) {
    var year = dateString.substr(0, 4);
    var month = dateString.substr(4, 2);
    var day = dateString.substr(6, 2);
    return new Date(year, month - 1, day);
}

// take an array of these string dates and return an array of date objects
var convertStringsToDateArray = function(date_string_array) {
    var date_array = [];
    for (var i = 0; i < date_string_array.length; i++) {
        date_array.push(customDateStringToJSDate(date_string_array[i].toString()));
    }
    return date_array;
}

// find how many days have elapsed in a date object
var getDaysElapsed = function(date) {
    var date2 = new Date(date.getFullYear(), 01, 1);
    var timeDiff = Math.abs(date.getTime() - date2.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

// take displacements, decimal dates, and slope of linear regression line
// returns array of numbers = (displacements - slope * decimal dates)
var getlinearDetrend = function(displacements, decimal_dates, slope) {
    detrend_array = [];
    for (i = 0; i < decimal_dates.length; i++) {
        detrend = displacements[i] - (slope * (decimal_dates[i] - decimal_dates[0]))
        detrend_array.push(detrend);
    }
    return detrend_array;
}

var dateToDecimal = function(date) {
    return date.getFullYear() + getDaysElapsed(date) / 365;
}

// convert date in decimal - for example, 20060131 is Jan 31, 2006
// 31 days have passed so decimal format = [2006 + (31/365)] = 2006.0849
// take an array of date objects and return an array of date decimals
var convertDatesToDecimalArray = function(date_array) {
    var decimals = [];
    for (i = 0; i < date_array.length; i++) {
        decimals.push(dateToDecimal(date_array[i]));
    }
    return decimals;
}

// takes displacements and dates, returns slope and y intercept in array
function calcLinearRegression(displacements, decimal_dates) {
    data = [];
    for (i = 0; i < decimal_dates.length; i++) {
        // data.push([displacements[i], decimal_dates[i]]);
        data.push([decimal_dates[i], displacements[i]]);
    }
    var result = regression('linear', data);
    return result;
}

// takes slope, y-intercept; decimal_dates and chart_data(displacement) must
// this.start and end around bounds of the sliders
function getRegressionChartData(slope, y, decimal_dates, chart_data) {
    var data = [];
    var first_date = chart_data[0][0];
    var first_reg_displacement = slope * decimal_dates[0] + y;
    var last_date = chart_data[chart_data.length - 1][0];
    var last_reg_displacement = slope * decimal_dates[decimal_dates.length - 1] + y;
    data.push([first_date, first_reg_displacement]);
    data.push([last_date, last_reg_displacement]);
    return data;
}

// returns an array of [date, displacement] objects
function getDisplacementChartData(displacements, dates) {
    var data = [];
    for (i = 0; i < dates.length; i++) {
        var year = parseInt(dates[i].toString().substr(0, 4));
        var month = parseInt(dates[i].toString().substr(4, 2));
        var day = parseInt(dates[i].toString().substr(6, 2));
        data.push([Date.UTC(year, month - 1, day), displacements[i]]);
    }
    return data;
}

function Map(loadJSONFunc) {
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    this.startingZoom = 1.6;
    this.startingCoords = [0, 30];
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.geoDataMap = {};
    this.layers_ = [];
    this.loadJSONFunc = loadJSONFunc;
    this.tileURLID = "kjjj11223344.4avm5zmh";
    this.tileJSON = null;
    this.clickLocationMarker = {
        type: "geojson",
        data: {}
    };
    this.clickLocationMarker2 = {
        type: "geojson",
        data: {}
    };
    this.selector = null;
    this.areaFilterSelector = null;
    this.zoomOutZoom = 7.0;
    this.graphsController = new GraphsController(this);
    this.areas = null;
    this.areaFeatures = null;
    this.colorScale = new ColorScale(-2.00, 2.00);
    this.colorOnDisplacement = false;
    this.lastAreasRequest = null;

    this.areaMarkerLayer = new AreaMarkerLayer(this);

    this.areaPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    this.elevationPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    this.gpsStationNamePopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    this.gpsStationPopup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false
    });

    this.previousZoom = this.startingZoom;

    this.disableInteractivity = function() {
        this.map.dragPan.disable();
        this.map.scrollZoom.disable();
        this.map.doubleClickZoom.disable();
    };

    this.enableInteractivity = function() {
        this.map.dragPan.enable();
        this.map.scrollZoom.enable();
        this.map.doubleClickZoom.enable();
    };

    this.clickOnAPoint = function(e) {
        var features = this.map.queryRenderedFeatures(e.point);

        // var layerID = "touchLocation";

        if (!features.length) {
            return;
        }

        var feature = features[0];

        if (feature.layer.id == "gpsStations") {
            var coordinates = feature.geometry.coordinates;
            this.gpsStationPopup.remove();
            this.gpsStationPopup.setLngLat(coordinates)
                .setHTML(feature.properties.popupHTML)
                .addTo(this.map);

            return;
        }

        // clicked on area marker, reload a new area.
        var markerSymbol = feature.properties["marker-symbol"];
        if ((markerSymbol == "marker" || markerSymbol == "fillPolygon") && this.anAreaWasPreviouslyLoaded()) {
            if (this.pointsLoaded()) {
                this.removePoints();
            }

            this.removeTouchLocationMarkers();
            this.clickOnAnAreaMarker(e);
            return;
        }

        var long = feature.geometry.coordinates[0];
        var lat = feature.geometry.coordinates[1];
        var pointNumber = feature.properties.p;

        currentPoint = pointNumber;

        if (pointNumber === undefined || pointNumber === null || feature.layer.id == "contours" || feature.layer.id == "contour_label") {
            return;
        }

        var title = pointNumber.toString();
        var query = {
            "area": currentArea.properties.unavco_name,
            "pointNumber": pointNumber
        };

        var chartContainer = "chartContainer";
        var clickMarker = this.clickLocationMarker;
        var markerSymbol = "cross";

        if (this.graphsController.selectedGraph == "Bottom Graph") {
            chartContainer = "chartContainer2";
            clickMarker = this.clickLocationMarker2;
            markerSymbol += "Red";
        }

        var layerID = this.graphsController.selectedGraph;

        clickMarker.data = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [long, lat]
                },
                "properties": {
                    "marker-symbol": markerSymbol
                }
            }]
        };

        // show cross on clicked point
        if (this.map.getLayer(layerID)) {
            this.map.removeLayer(layerID);
            this.map.removeSource(layerID);
        }

        this.map.addSource(layerID, clickMarker);
        this.map.addLayer({
            "id": layerID,
            "type": "symbol",
            "source": layerID,
            "layout": {
                "icon-image": "{marker-symbol}-15",
            }
        });

        var pointDetailsHtml = lat.toFixed(5) + ", " + long.toFixed(5);

        $("#point-details").html(pointDetailsHtml);

        $("#search-form-and-results-minimize-button").click();

        // load displacements from server, and then show on graph
        loadJSONFunc(query, "point", function(response) {
            $("#graph-div-maximize-button").click();

            var json = JSON.parse(response);
            this.graphsController.JSONToGraph(json, chartContainer, e);

            // request elevation of point from google api
            var elevationGetter = new google.maps.ElevationService;
            elevationGetter.getElevationForLocations({
                "locations": [{ lat: lat, lng: long }]
            }, function(results, status) {
                if (status === google.maps.ElevationStatus.OK) {
                    // redundant but to avoid race conditions between two successive clicks
                    $("#point-details").html(pointDetailsHtml);
                    $("#point-details").append("<br>Elevation: " + results[0].elevation.toFixed(0) + " meters");
                } else {
                    console.log(status);
                }
            });
        }.bind(this));
    };

    this.determineZoomOutZoom = function() {
        // memorize the zoom we clicked at, but only if it's more zoomed out than
        // the flyTo zoom when an area is loaded
        var currentZoom = this.map.getZoom();
        if (currentZoom <= 7.0) {
            // prevent zoom below 0.5, as floating point inaccuracies can cause bugs at most zoomed out level
            if (currentZoom <= 0.5) {
                this.zoomOutZoom = 0.5;
            } else {
                this.zoomOutZoom = this.map.getZoom();
            }
        }
    };

    this.getMarkersAtSameLocationAsMarker = function(marker, markers) {
        var markersAtPoint = [];
        var lat = marker.geometry.coordinates[1];
        var long = marker.geometry.coordinates[0];

        for (var i = 0; i < markers.length; i++) {
            var curMarkerLat = markers[i].geometry.coordinates[1];
            var curMarkerLong = markers[i].geometry.coordinates[0];

            if (curMarkerLat = lat && curMarkerLong == long) {
                markersAtPoint.push(markers[i]);
            }
        }

        return markersAtPoint;
    };

    this.getFirstPolygonFrameAtPoint = function(features) {
        for (var i = 0; i < features.length; i++) {
            if (features[i].properties["marker-symbol"] == "fillPolygon") {
                return features[i];
            }
        }

        return null;
    };

    this.leftClickOnAPoint = function(e) {
        this.clickOnAPoint(e);
    };

    this.rightClickOnAPoint = function(e) {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            this.clickOnAPoint(e);
        }
    };

    this.clickOnAnAreaMarker = function(e) {
        var features = this.map.queryRenderedFeatures(e.point);

        if (!features.length) {
            return;
        }

        var firstFeature = features[0];

        if (firstFeature.layer.id == "gpsStations") {
            var coordinates = firstFeature.geometry.coordinates;
            this.gpsStationPopup.remove();
            this.gpsStationPopup.setLngLat(coordinates)
                .setHTML(firstFeature.properties.popupHTML)
                .addTo(this.map);

            return;
        }

        var layerID = "touchLocation";

        // remove cluster count check if you remove clustering
        var frameFeature = this.getFirstPolygonFrameAtPoint(features);
        if (frameFeature) {
            this.determineZoomOutZoom();

            var feature = frameFeature;

            var unavco_name = feature.properties.unavco_name;
            var project_name = feature.properties.project_name;
            var lat = feature.geometry.coordinates[0];
            var long = feature.geometry.coordinates[1];
            var num_chunks = feature.properties.num_chunks;
            var attributeKeys = feature.properties.attributekeys;
            var attributeValues = feature.properties.attributevalues;

            var markerID = feature.properties.layerID;

            getGEOJSON(feature);
        }
    };

    this.setBaseMapLayer = function(mapType) {
        var tileset = 'mapbox.' + mapType;
        this.layers_ = [];

        this.layers_.push({
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        });
        this.map.setStyle({
            version: 8,
            sprite: getRootUrl() + "maki/makiIcons",
            glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
            sources: {
                "raster-tiles": {
                    "type": "raster",
                    "url": "mapbox://" + tileset,
                    "tileSize": 256
                },
                'Mapbox Terrain V2': {
                    type: 'vector',
                    url: 'mapbox://mapbox.mapbox-terrain-v2'
                }
            },
            layers: this.layers_
        });
    };

    // extremas: current min = -0.02 (blue), current max = 0.02 (red)
    this.addDataset = function(data) {
        this.colorOnDisplacement = false;
        var stops = this.colorScale.getMapboxStops();

        this.map.addSource('vector_layer_', {
            type: 'vector',
            tiles: data['tiles'],
            minzoom: data['minzoom'],
            maxzoom: data['maxzoom'],
            bounds: data['bounds']
        });

        data['vector_layers'].forEach(function(el) {
            var layer = {
                id: el['id'],
                source: 'vector_layer_',
                'source-layer': el['id'],
                type: 'circle',
                layout: {
                    'visibility': 'visible'
                },
                paint: {
                    'circle-color': {
                        property: 'm',
                        stops: stops
                    },
                    'circle-radius': {
                        // for an explanation of this array see here:
                        // https://www.mapbox.com/blog/data-driven-styling/
                        stops: [
                            [5, 2],
                            [8, 2],
                            [13, 8],
                            [21, 16],
                            [34, 32]
                        ]
                    }
                }
            }
            this.layers_.push(layer);
            this.map.addLayer(layer);
        }.bind(this));

        // remove click listener for selecting an area, and add new one for clicking on a point
        this.map.off("click", this.clickOnAnAreaMarker);
        // also left clicking, only to add it again.
        // TODO: check how to check what function handlers are registered
        // while this works, it is ugly to remove and then add immediately
        this.map.off("click", this.leftClickOnAPoint);
        this.leftClickOnAPoint = this.leftClickOnAPoint.bind(this);
        this.map.on('click', this.leftClickOnAPoint);
    };

    this.polygonToLineString = function(polygonGeoJSON) {
        var lineStringGeoJSON = {
            type: "LineString",
            coordinates: []
        };
        var coordinates = polygonGeoJSON.coordinates[0];
        for (var i = 0; i < coordinates.length; i++) {
            lineStringGeoJSON.coordinates.push(coordinates[i]);
        }

        return lineStringGeoJSON;
    };

    this.addAreaMarkersFromJSON = function(json, toExclude) {
        this.areas = json;

        var areaMarker = {
            type: "geojson",
            cluster: false,
            clusterRadius: 10,
            data: {}
        };
        var features = [];

        var attributesController = new AreaAttributesController(this, json.areas[0]);
        var searchFormController = new SearchFile();

        $("#search-form-results-table tbody").empty();
        for (var i = 0; i < json.areas.length; i++) {
            var area = json.areas[i];

            var lat = area.coords.latitude;
            var long = area.coords.longitude;

            attributesController.setArea(area);
            var attributes = attributesController.getAllAttributes();

            var scene_footprint = attributes.scene_footprint;
            var polygonGeoJSON = Terraformer.WKT.parse(scene_footprint);
            var lineStringGeoJSON = this.polygonToLineString(polygonGeoJSON);

            var id = "areas" + i;
            var polygonID = "areas" + i + "fill"

            this.areaMarkerLayer.addLayer(id);

            var properties = area.properties;

            var feature = {
                "type": "Feature",
                "geometry": polygonGeoJSON,
                "properties": {
                    "marker-symbol": "marker",
                    "layerID": id,
                    "centerOfDataset": area.coords,
                    "unavco_name": properties.unavco_name,
                    "region": properties.region,
                    "project_name": properties.project_name,
                    "num_chunks": properties.num_chunks,
                    "country": properties.country,
                    "decimal_dates": properties.decimal_dates,
                    "string_dates": properties.string_dates,
                    "attributekeys": properties.attributekeys,
                    "attributevalues": properties.attributevalues,
                    "extra_attributes": properties.extra_attributes
                }
            };

            // use same properties as the main feature which will be used
            // for the fill layer. We use the id of the corresponding fill layer...
            // allows for only highlighting on frame hover
            var polygonFeature = {
                "type": "Feature",
                "geometry": polygonGeoJSON,
                "properties": feature.properties
            };

            features.push(feature);
            searchFormController.generateMatchingAreaHTML(attributes, feature);

            // exclude this area from showing on the map, but we still want to add it
            // to our areaFeatures array so we can highlight the current area
            if (toExclude != null && toExclude.indexOf(area.properties.unavco_name) != -1) {
                continue;
            }

            // add the markers representing the available areas
            areaMarker.data = {
                "type": "FeatureCollection",
                "features": [feature]
            };

            if (this.map.getSource(id)) {
                this.map.removeSource(id);
                this.map.removeSource(polygonID)
            }

            if (this.map.getLayer(id)) {
                this.map.removeLayer(id);
                this.map.removeLayer(polygonID);
            }

            this.map.addSource(id, areaMarker);
            polygonFeature.properties["marker-symbol"] = "fillPolygon";
            areaMarker.data = {
                "type": "FeatureCollection",
                "features": [polygonFeature]
            };
            this.map.addSource(polygonID, areaMarker);

            // if dataset loaded, insert areas before dataset layer
            var swathWidth = 3;
            if (this.map.getLayer("chunk_1")) {
                this.map.addLayer({
                    "id": id,
                    "type": "fill",
                    "source": id,
                    "paint": {
                        "fill-color": "rgba(0, 0, 255, 0.0)",
                        "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                    }
                }, "chunk_1");
                this.map.addLayer({
                    "id": polygonID,
                    "type": "line",
                    "source": polygonID,
                    "layout": {
                        "line-join": "round",
                        "line-cap": "round"
                    },
                    "paint": {
                        "line-color": "rgba(0, 0, 255, 1.0)",
                        "line-width": swathWidth
                    }
                }, "chunk_1");
            } else {
                this.map.addLayer({
                    "id": id,
                    "type": "fill",
                    "source": id,
                    "paint": {
                        "fill-color": "rgba(0, 0, 255, 0.0)",
                        "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                    }
                });
                this.map.addLayer({
                    "id": polygonID,
                    "type": "line",
                    "source": polygonID,
                    "paint": {
                        "line-color": "rgba(0, 0, 255, 1.0)",
                        "line-width": swathWidth
                    }
                });
            }
        };

        // make search form table highlight on hover
        $("#search-form-results-table tr").hover(function() {
            searchTableHoverIn(this);
        }, function() {
            searchTableHoverOut(this);
        });

        $("#search-form-results-table").trigger("update");
        this.areaFeatures = features;
        populateSearchDatalists();

        // add the markers representing the available areas
        areaMarker.data = {
            "type": "FeatureCollection",
            "features": features
        };

        return features;
    };

    this.loadAreaMarkersExcluding = function(toExclude, after) {
        if (this.lastAreasRequest) {
            this.lastAreasRequest.abort();
        }

        this.lastAreasRequest = $.ajax({
            url:"/areas",
            success: function(response) {
                var json = JSON.parse(response);
                var features = this.addAreaMarkersFromJSON(json, toExclude);

                if (after) {
                    after(features);
                }
                this.lastAreasRequest = null;
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                this.lastAjaxRequest = null;
            }
        });
    };

    this.loadAreaMarkers = function(after) {
        this.loadAreaMarkersExcluding(null, after);
    };

    this.removeAreaMarkers = function() {
        for (var i = 0; i < this.areaFeatures.length; i++) {
            var id = this.areaFeatures[i].properties.layerID;
            if (this.map.getLayer(id)) {
                // see why we can't remove source here as well...
                this.map.removeLayer(id);
                // remove fill layer allowing highlighting of our line string hacked
                // polygons
                this.map.removeLayer(id + "fill");
            }
        }

        this.areaFeatures = [];
    };

    // until mapbox api gives us a way to determine when all points of mbtiles
    // have finished fully rendering. TODO: use this instead of timers when
    // endless render loop bug is fixed.
    this.onDatasetRendered = function(callback) {
        var renderHandler = function() {
            if (this.map.loaded()) {
                callback(renderHandler);
            }
        }.bind(this);
        this.map.on("render", renderHandler);
    };

    this.addMapToPage = function(containerID) {
        this.map = new mapboxgl.Map({
            container: containerID, // container id
            center: this.startingCoords, // this.starting position
            zoom: this.startingZoom, // this.starting zoom
            attributionControl: false
        }).addControl(new mapboxgl.AttributionControl({
            compact: true
        }));

        this.map.on("load", function() {
            this.map.getCanvas().style.cursor = 'auto';
            this.selector = new RecolorSelector();
            this.selector.map = this;
            this.selector.associatedButton = $("#polygon-button");
            this.selector.prepareEventListeners();
            this.loadAreaMarkers(function(areaFeatures) {
                if (viewOptions.startDataset) {
                    for (var i = 0; i < areaFeatures.length; i++) {
                        if (areaFeatures[i].properties.unavco_name === viewOptions.startDataset) {
                            showLoadingScreen("Loading requested dataset...");
                            getGEOJSON(areaFeatures[i]);
                            break;
                        }
                    }
                }
            });
            this.areaFilterSelector = new AreaFilterSelector();
            this.areaFilterSelector.map = this;
        }.bind(this));

        this.setBaseMapLayer("streets");

        this.map.addControl(new mapboxgl.NavigationControl());

        // disable rotation gesture
        this.map.dragRotate.disable();
        // and box zoom
        this.map.boxZoom.disable();

        this.clickOnAnAreaMarker = this.clickOnAnAreaMarker.bind(this);
        this.map.on('click', this.clickOnAnAreaMarker);

        //this.map.on("contextmenu", this.rightClickOnAPoint);

        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        // mainly used to show available areas under a marker
        this.map.on('mousemove', function(e) {
            var features = this.map.queryRenderedFeatures(e.point);

            // mouse not under a marker, clear all popups
            if (!features.length) {
                this.areaPopup.remove();
                this.gpsStationNamePopup.remove();
                this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                this.areaMarkerLayer.resetHighlightsOfAllAreaRows(currentArea);
                this.map.getCanvas().style.cursor = 'auto';
                return;
            }

            var layerID = features[0].layer.id;
            var layerSource = features[0].layer.source;
            var markerSymbol = features[0].properties["marker-symbol"];
            var itsAnreaPolygon = (markerSymbol === "fillPolygon");
            var itsAPoint = (layerSource === "vector_layer_" || layerSource === "onTheFlyJSON");
            var itsAGPSFeature = (layerID === "gpsStations");
            var frameFeature = this.getFirstPolygonFrameAtPoint(features);

            this.map.getCanvas().style.cursor = (itsAPoint || itsAnreaPolygon || itsAGPSFeature || frameFeature) ? 'pointer' : 'auto';

            // a better way is to have two mousemove callbacks like we do with select area vs select marker
            if (itsAGPSFeature) {
                this.gpsStationNamePopup.remove();
                var coordinates = features[0].geometry.coordinates;
                this.gpsStationNamePopup.setLngLat(coordinates)
                    .setHTML(features[0].properties.stationName)
                    .addTo(this.map);
            } else if (frameFeature) {
                this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                this.areaMarkerLayer.resetHighlightsOfAllAreaRows(null);
                this.areaMarkerLayer.setAreaRowHighlighted(frameFeature.properties.layerID);
                this.areaMarkerLayer.setPolygonHighlighted(frameFeature.properties.layerID, "rgba(0, 0, 255, 0.3)");
            } else {
                this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                this.areaMarkerLayer.resetHighlightsOfAllAreaRows(currentArea);
            }
        }.bind(this));

        this.map.on('zoomend', function() {
            var currentZoom = this.map.getZoom();

            if (this.areaSwathsLoaded()) {
                var bounds = this.map.getBounds();
                var bbox = [bounds._ne, bounds._sw];
                this.areaFilterSelector.filterAreas(bbox);
            }
            // reshow area markers once we zoom out enough
            if (currentZoom < this.zoomOutZoom) {
                if (this.pointsLoaded()) {
                    this.reset();
                    // otherwise, points aren't loaded, but area previously was active
                } else if (this.anAreaWasPreviouslyLoaded()) {
                    this.removeAreaPopups();
                    this.loadAreaMarkers(null);
                    // remove click listener for selecting an area, and add new one for clicking on a point
                    this.map.off("click", this.leftClickOnAPoint);
                    this.map.on('click', this.clickOnAnAreaMarker);
                }
            }

            var onTheFlyJSON = this.map.getSource("onTheFlyJSON");
            if ((onTheFlyJSON || this.colorOnDisplacement) && !this.selector.recoloring()) {
                var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.string_dates));
                var startDate = new Date(dates[0]);
                var endDate = new Date(dates[dates.length - 1]);
                if (this.selector.minIndex != -1 && this.selector.maxIndex != -1) {
                    startDate = new Date(dates[this.selector.minIndex]);
                    endDate = new Date(dates[this.selector.maxIndex]);
                }
                // it doesn't fire render events if we zoom out, so we recolor anyways when we zoom
                // out. but what about the cases when it does refire? then we have incomplete recoloring.
                // TODO: investigate and fix
                if (currentZoom < this.previousZoom) {
                    if (this.colorOnDisplacement) {
                        this.selector.recolorOnDisplacement(startDate, endDate, "Recoloring in progress (ESCAPE to interrupt)... for fast zoom, switch to velocity or disable or deselect on the fly coloring");
                    } else {
                        this.selector.recolorDataset();
                    }
                } else {
                    this.onDatasetRendered(function(renderCallback) {
                        if (this.colorOnDisplacement) {
                            this.selector.recolorOnDisplacement(startDate, endDate, "Recoloring in progress (ESCAPE to interrupt)... for fast zoom, switch to velocity or disable or deselect on the fly coloring");
                        } else {
                            this.selector.recolorDataset();
                        }

                        this.map.off("render", renderCallback);
                    }.bind(this));
                }
            }

            this.previousZoom = currentZoom;
        }.bind(this));
    };

    this.pointsLoaded = function() {
        return this.map.getSource("vector_layer_") != null;
    };

    this.areaSwathsLoaded = function() {
        // we always have areas0 at minimum if areas swaths loaded
        // how to avoid checking points loaded? remove area sources when
        // we click on a point
        return this.map.getSource("areas0") != null && !this.pointsLoaded();
    };

    this.anAreaWasPreviouslyLoaded = function() {
        return this.tileJSON != null;
    };

    this.removePoints = function() {
        if (!this.pointsLoaded()) {
            return;
        }

        this.map.removeSource("vector_layer_");

        for (var i = 1; i <= currentArea.properties.num_chunks; i++) {
            this.map.removeLayer("chunk_" + i);
        }

        // remove all layers but the first, base layer
        this.layers_ = this.layers_.slice(0, 1);

        if (this.map.getSource("onTheFlyJSON")) {
            this.map.removeSource("onTheFlyJSON");
            this.map.removeLayer("onTheFlyJSON");
        }
    }

    this.removeTouchLocationMarkers = function() {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        var layerID = "Top Graph";
        if (this.map.getLayer(layerID)) {
            this.map.removeLayer(layerID);
            this.map.removeSource(layerID);

            this.clickLocationMarker = {
                type: "geojson",
                data: {}
            };
        }

        layerID = "Bottom Graph";
        if (this.map.getLayer(layerID)) {
            this.map.removeLayer(layerID);
            this.map.removeSource(layerID);

            this.clickLocationMarker2 = {
                type: "geojson",
                data: {}
            };
        }
    };

    this.removeAreaPopups = function() {
        // remove popup which shows area attributes
        $("#area-attributes-div-minimize-button").click();
        // and the graphs
        $("#graph-div-minimize-button").click();

        // and color scale
        if ($("#color-scale").hasClass("active")) {
            $("#color-scale").toggleClass("active");
        }
    };

    this.reset = function() {
        this.removePoints();
        this.removeTouchLocationMarkers();
        // incase they are up
        this.elevationPopup.remove();
        this.gpsStationPopup.remove();
        this.gpsStationNamePopup.remove();

        this.removeGPSStationMarkers();
        gpsStationsToggleButton.set("off");

        $("#color-on-dropdown").val("velocity");
        $("#color-scale-text-div").html("LOS Velocity [cm/yr]");

        this.loadAreaMarkers(null);

        // remove old click listeners, and add new one for clicking on an area marker
        this.map.off("click", this.leftClickOnAPoint);
        this.map.off("click", this.clickOnAnAreaMarker);

        this.clickOnAnAreaMarker = this.clickOnAnAreaMarker.bind(this);
        this.map.on('click', this.clickOnAnAreaMarker);

        this.removeAreaPopups();
        $("#search-form-and-results-minimize-button").click();

        $("#point-details").empty();

        overlayToggleButton.set("off");
        this.tileJSON = null;
        this.colorOnDisplacement = false;

        // change square selector back to filtering areas
        var button = $("#polygon-button");
        button.attr("data-original-title", "Filter Areas");
        this.selector.disableSelectMode(); // in case it is selected
        this.selector.removeEventListeners(); // remove old event listeners
        this.selector = new AreaFilterSelector();
        this.selector.map = this;
        this.selector.associatedButton = button;
        this.selector.prepareEventListeners(); // and add new ones

        var container = $("#hidden-search-bars-container");
        $("#search-form input").val("");
        if (container.hasClass("active")) {
            container.removeClass("active");
        }
    };

    this.addContourLines = function() {
        this.map.addLayer({
            'id': 'contours',
            'type': 'line',
            'source': 'Mapbox Terrain V2',
            'source-layer': 'contour',
            'layout': {
                'visibility': 'visible',
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#877b59',
                'line-width': 1
            }
        });
        this.map.addLayer({
            "id": "contour_label",
            "type": "symbol",
            "source": "Mapbox Terrain V2",
            "source-layer": "contour",
            "minzoom": 0,
            "maxzoom": 22,
            "filter": ["all", ["==", "$type", "Polygon"],
                ["==", "index", 5]
            ],
            "layout": {
                "symbol-placement": "line",
                "text-field": "{ele}",
                "text-font": ["Open Sans Regular,   Arial Unicode MS Regular"],
                "text-letter-spacing": 0,
                "text-line-height": 1.6,
                "text-max-angle": 10,
                "text-rotation-alignment": "map"
            },
            "paint": {
                //"text-size": 0
            },
            "paint.contours": {
                "text-opacity": 1,
                "text-halo-blur": 0,
                //"text-size": 12,
                "text-halo-width": 1,
                "text-halo-color": "#333",
                "text-color": "#00fcdc"
            }
        });
    };

    this.removeContourLines = function() {
        this.map.removeLayer("contours");
        this.map.removeLayer("contour_label");
    };

    this.prettyPrintProjectName = function(projectName) {
        var trackIndex = projectName.indexOf("T");
        var frameIndex = projectName.indexOf("F");
        var trackNumber = projectName.substring(trackIndex + 1, frameIndex);
        var regionName = projectName.substring(0, trackIndex);

        var prettyPrintedName = regionName;


        // sometimes there is only one track number instead of framenumber_framenumber - look for "_"
        var regex = /_/;

        var underscoreFound = projectName.match(regex);

        var firstFrame = null;
        var lastFrame = null;
        var frames = null;
        var frameNumbers = null;
        var missionIndex = 0;

        // multiple tracks
        if (underscoreFound) {
            regex = /F\d+_\d+/;

            frames = projectName.match(regex);
            frameNumbers = frames[0].split("_");
            firstFrame = frameNumbers[0];
            lastFrame = frameNumbers[1];
            missionIndex = regionName.length + firstFrame.length + lastFrame.length + 1 + trackNumber.length;
        } else {
            regex = /F\d+/;
            frames = projectName.match(regex);
            frameNumbers = frames[0].split("_");
            firstFrame = frames[0];
            lastFrame = frames[0];
            missionIndex = regionName.length + firstFrame.length + trackNumber.length;
        }

        var mission = projectName.substring(missionIndex + 1, projectName.length);
        var missionType = mission.charAt(mission.length - 1);
        var missionSatellite = mission.substring(0, mission.length - 1);
        mission = mission.substring(0, mission.length - 1);
        mission += " " + missionType;

        prettyPrintedName += " " + mission + " T" + trackNumber;

        var name = {
            fullPrettyName: prettyPrintedName,
            missionSatellite: missionSatellite,
            region: regionName,
            missionType: missionType,
            trackNumber: trackNumber,
            frameNumbers: [firstFrame, lastFrame]
        };

        return name;
    };

    this.refreshDataset = function() {
        var stops = this.colorScale.getMapboxStops();

        this.layers_.forEach(function(layer) {
            if (this.map.getPaintProperty(layer.id, "circle-color")) {
                this.map.setPaintProperty(layer.id, "circle-color", {
                    property: 'm',
                    stops: stops
                });
            }
        }.bind(this));

        if (this.map.getLayer("onTheFlyJSON")) {
            this.map.setPaintProperty("onTheFlyJSON", "circle-color", {
                property: 'm',
                stops: stops
            });
        }
    };

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
        this.map.addSource(layerID, mapboxStationFeatures);
        this.map.addLayer({
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
        var layerID = "gpsStations";

        if (this.map.getSource(layerID)) {
            this.map.removeSource(layerID);
        }

        if (this.map.getLayer(layerID)) {
            this.map.removeLayer(layerID);
        }
    };
}


// function to use AJAX to load json from that same website - I looked online and AJAX is basically just used
// to asynchronously load data using javascript from a server, in our case, our local website
function loadJSON(arg, param, callback) {
    var fullQuery = param + "/"

    for (var key in arg) {
        fullQuery += arg[key] + "/"
    }

    console.log(fullQuery);
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', fullQuery, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
