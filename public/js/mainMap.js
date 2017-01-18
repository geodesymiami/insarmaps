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
// take an array of these strings and return an array of date objects
var convertStringsToDateArray = function(date_string_array) {
    var date_array = [];
    for (i = 0; i < date_string_array.length; i++) {
        var year = date_string_array[i].toString().substr(0, 4);
        var month = date_string_array[i].toString().substr(4, 2);
        var day = date_string_array[i].toString().substr(6, 2);
        var date = new Date(year, month - 1, day);
        date_array.push(date);
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
// that.start and end around bounds of the sliders
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
    var that = this;
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
    this.zoomOutZoom = 7.0;
    this.graphsController = new GraphsController();
    this.areas = null;
    this.areaFeatures = null;
    this.colorScale = new ColorScale(-2.00, 2.00);

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
        that.map.dragPan.disable();
        that.map.scrollZoom.disable();
        that.map.doubleClickZoom.disable();
    };

    this.enableInteractivity = function() {
        that.map.dragPan.enable();
        that.map.scrollZoom.enable();
        that.map.doubleClickZoom.enable();
    };

    this.clickOnAPoint = function(e) {
        var features = that.map.queryRenderedFeatures(e.point);

        // var layerID = "touchLocation";

        if (!features.length) {
            return;
        }

        var feature = features[0];

        if (feature.layer.id == "gpsStations") {
            var coordinates = feature.geometry.coordinates;
            that.gpsStationPopup.remove();
            that.gpsStationPopup.setLngLat(coordinates)
                .setHTML(feature.properties.popupHTML)
                .addTo(that.map);

            return;
        }

        // clicked on area marker, reload a new area.
        var markerSymbol = feature.properties["marker-symbol"];
        if ((markerSymbol == "marker" || markerSymbol == "fillPolygon") && that.anAreaWasPreviouslyLoaded()) {
            if (that.pointsLoaded()) {
                that.removePoints();
            }

            that.removeTouchLocationMarkers();
            that.clickOnAnAreaMarker(e);
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
        var clickMarker = that.clickLocationMarker;
        var markerSymbol = "cross";

        if (that.graphsController.selectedGraph == "Bottom Graph") {
            chartContainer = "chartContainer2";
            clickMarker = that.clickLocationMarker2;
            markerSymbol += "Red";
        }

        var layerID = that.graphsController.selectedGraph;

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
        if (that.map.getLayer(layerID)) {
            that.map.removeLayer(layerID);
            that.map.removeSource(layerID);
        }

        that.map.addSource(layerID, clickMarker);
        that.map.addLayer({
            "id": layerID,
            "type": "symbol",
            "source": layerID,
            "layout": {
                "icon-image": "{marker-symbol}-15",
            }
        });

        var pointDetailsHtml = lat.toFixed(5) + ", " + long.toFixed(5);

        $("#point-details").html(pointDetailsHtml);

        // load displacements from server, and then show on graph
        loadJSONFunc(query, "point", function(response) {
            if (!$(".wrap#charts").hasClass("active")) {
                $(".wrap#charts").toggleClass("active");
            }

            var json = JSON.parse(response);

            var date_string_array = json.string_dates;
            var date_array = convertStringsToDateArray(date_string_array);
            var decimal_dates = json.decimal_dates;
            var displacement_array = json.displacements;

            // convert from m to cm
            displacement_array.forEach(function(element, index, array) {
                array[index] = 100 * array[index];
            });

            that.graphsController.graphSettings[chartContainer].date_string_array = date_string_array;
            that.graphsController.graphSettings[chartContainer].date_array = date_array;
            that.graphsController.graphSettings[chartContainer].decimal_dates = decimal_dates;
            that.graphsController.graphSettings[chartContainer].displacement_array = displacement_array;

            // returns array for displacement on chart
            chart_data = getDisplacementChartData(displacement_array, date_string_array);

            // calculate and render a linear regression of those dates and displacements
            var result = calcLinearRegression(displacement_array, decimal_dates);
            var slope = result["equation"][0];
            var y = result["equation"][1];

            // testing standard deviation calculation - we are using slope of linear reg line
            // as mean which gives different answer from taking mean of displacements
            var velocity_std = getStandardDeviation(displacement_array, slope);

            // returns array for linear regression on chart
            var regression_data = getRegressionChartData(slope, y, decimal_dates, chart_data);

            // now add the new regression line as a second dataset in the chart
            firstToggle = true;

            var chartOpts = {
                title: {
                    text: null
                },
                subtitle: {
                    text: "velocity: " + (slope * 10).toFixed(2).toString() + " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() + " mm/yr"
                },
                navigator: {
                    enabled: true
                },
                scrollbar: {
                    liveRedraw: false
                },
                xAxis: {
                    type: 'datetime',
                    events: { // get dates for slider bounds
                        afterSetExtremes: function(e) {
                            // we get called when graph is created
                            that.graphsController.graphSettings[chartContainer].navigatorEvent = e;
                            that.graphsController.getValideDatesFromNavigatorExtremes(chartContainer);

                            var graphSettings = that.graphsController.graphSettings[chartContainer];
                            // update velocity, even if we don't have a linear regression line, needed the extra check as this library calls this function when graph is created... sigh
                            var displacements = (detrendToggleButton.toggleState == ToggleStates.ON && graphSettings.detrend_displacement_array) ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
                            var regression_data = that.graphsController.getLinearRegressionLine(chartContainer, displacements);
                            var sub_slope = regression_data.linearRegressionData["equation"][0];
                            var velocity_std = regression_data.stdDev;
                            var chart = $("#" + chartContainer).highcharts();
                            var velocityText = "velocity: " + (sub_slope * 10).toFixed(2).toString() + " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() + " mm/yr"

                            that.graphsController.highChartsOpts[chartContainer].subtitle.text = velocityText;

                            chart.setTitle(null, {
                                text: velocityText
                            });

                            if (regressionToggleButton.toggleState == ToggleStates.ON) {
                                var graphSettings = that.graphsController.graphSettings[chartContainer];
                                var displacements_array = (detrendToggleButton.toggleState == ToggleStates.ON && graphSettings.detrend_displacement_array) ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
                                that.graphsController.addRegressionLine(chartContainer, displacements_array);
                            }

                            if (that.selector.bbox != null && that.selector.minIndex != -1 && that.selector.maxIndex != -1) {
                                that.selector.recolorDataset();
                            }
                        }
                    },
                    dateTimeLabelFormats: {
                        month: '%e. %b',
                        year: '%Y'
                    },
                    title: {
                        text: 'Date'
                    }
                },
                yAxis: {
                    title: {
                        text: 'Ground Displacement (cm)'
                    },
                    legend: {
                        layout: 'vertical',
                        align: 'left',
                        verticalAlign: 'top',
                        x: 100,
                        y: 70,
                        floating: true,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                    },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                tooltip: {
                    headerFormat: '',
                    pointFormat: '{point.x:%e. %b %Y}: {point.y:.6f} cm'
                },
                series: [{
                    type: 'scatter',
                    name: 'Displacement',
                    data: chart_data,
                    marker: {
                        enabled: true
                    },
                    showInLegend: false
                }],
                chart: {
                    marginRight: 50
                }
            };

            that.graphsController.graphSettings[chartContainer].navigatorEvent = e;

            // take out navigator not only if this is the bottom graph, but if the second graph toggle is on, period
            if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
                chartOpts.navigator.enabled = false;
            }

            $('#' + chartContainer).highcharts(chartOpts);
            that.graphsController.highChartsOpts[chartContainer] = chartOpts;

            that.graphsController.setNavigatorHandlers();

            // this calls recreate in the background.
            // TODO: make detrend data functions not call recreate
            if (detrendToggleButton.toggleState == ToggleStates.ON) {
                that.graphsController.detrendDataForGraph(chartContainer);
            }

            if (dotToggleButton.toggleState == ToggleStates.ON) {
                that.graphsController.toggleDots();
            }

            // this is hackish. due to bug which appears when we resize window before moving graph. jquery resizable
            // size does weird stuff to the graph, so we have to set every new graph to the dimensions of the original graph
            var width = $("#chartContainer").width();
            var height = $("#chartContainer").height();
            $("#" + chartContainer).highcharts().setSize(width, height, doAnimation = true);
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
        });
    };

    this.determineZoomOutZoom = function() {
        // memorize the zoom we clicked at, but only if it's more zoomed out than
        // the flyTo zoom when an area is loaded
        var currentZoom = that.map.getZoom();
        if (currentZoom <= 7.0) {
            // prevent zoom below 0.5, as floating point inaccuracies can cause bugs at most zoomed out level
            if (currentZoom <= 0.5) {
                that.zoomOutZoom = 0.5;
            } else {
                that.zoomOutZoom = that.map.getZoom();
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
        that.clickOnAPoint(e);
    };

    this.rightClickOnAPoint = function(e) {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            that.clickOnAPoint(e);
        }
    };

    this.clickOnAnAreaMarker = function(e) {
        var features = that.map.queryRenderedFeatures(e.point);

        if (!features.length) {
            return;
        }

        var firstFeature = features[0];

        if (firstFeature.layer.id == "gpsStations") {
            var coordinates = firstFeature.geometry.coordinates;
            that.gpsStationPopup.remove();
            that.gpsStationPopup.setLngLat(coordinates)
                .setHTML(firstFeature.properties.popupHTML)
                .addTo(that.map);

            return;
        }

        var layerID = "touchLocation";

        // remove cluster count check if you remove clustering
        if (firstFeature.layer.id == "cluster-count" || firstFeature.layer.id == "contours" || firstFeature.layer.id == "contour_label") {
            return;
        }

        that.determineZoomOutZoom();

        var feature = features[0];

        var unavco_name = feature.properties.unavco_name;
        var project_name = feature.properties.project_name;
        var lat = feature.geometry.coordinates[0];
        var long = feature.geometry.coordinates[1];
        var num_chunks = feature.properties.num_chunks;
        var attributeKeys = feature.properties.attributekeys;
        var attributeValues = feature.properties.attributevalues;

        var markerID = feature.properties.layerID;

        getGEOJSON(feature);
    };

    this.setBaseMapLayer = function(mapType) {
        var tileset = 'mapbox.' + mapType;
        that.layers_ = [];

        that.layers_.push({
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        });
        that.map.setStyle({
            version: 8,
            sprite: window.location.href + "maki/makiIcons",
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
            layers: that.layers_
        });
    };

    // extremas: current min = -0.02 (blue), current max = 0.02 (red)
    this.addDataset = function(data) {
        var stops = that.colorScale.getMapboxStops();

        that.map.addSource('vector_layer_', {
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
            that.layers_.push(layer);
            that.map.addLayer(layer);
        });

        // remove click listener for selecting an area, and add new one for clicking on a point
        that.map.off("click", that.clickOnAnAreaMarker);
        // also left clicking, only to add it again.
        // TODO: check how to check what function handlers are registered
        // while this works, it is ugly to remove and then add immediately
        that.map.off("click", that.leftClickOnAPoint);
        that.map.on('click', that.leftClickOnAPoint);
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

    this.loadAreaMarkersExcluding = function(toExclude) {
        loadJSONFunc("", "areas", function(response) {
            var json = JSON.parse(response);
            that.areas = json;

            var areaMarker = {
                type: "geojson",
                cluster: false,
                clusterRadius: 10,
                data: {}
            };
            var features = [];

            var attributesController = new AreaAttributesController(that, json.areas[0]);
            var searchFormController = new SearchFile();

            $("#search-form-results-table tbody").empty();
            for (var i = 0; i < json.areas.length; i++) {
                var area = json.areas[i];

                if (toExclude != null && toExclude.indexOf(area.properties.unavco_name) != -1) {
                    continue;
                }

                var lat = area.coords.latitude;
                var long = area.coords.longitude;

                attributesController.setArea(area);
                var attributes = attributesController.getAllAttributes();

                var scene_footprint = attributes.scene_footprint;
                var polygonGeoJSON = Terraformer.WKT.parse(scene_footprint);
                var lineStringGeoJSON = that.polygonToLineString(polygonGeoJSON);

                var id = "areas" + i;
                var polygonID = "areas" + i + "fill"

                that.areaMarkerLayer.addLayer(id);

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

                // add the markers representing the available areas
                areaMarker.data = {
                    "type": "FeatureCollection",
                    "features": [feature]
                };

                if (that.map.getSource(id)) {
                    that.map.removeSource(id);
                    that.map.removeSource(polygonID)
                }

                if (that.map.getLayer(id)) {
                    that.map.removeLayer(id);
                    that.map.removeLayer(polygonID);
                }

                that.map.addSource(id, areaMarker);
                polygonFeature.properties["marker-symbol"] = "fillPolygon";
                areaMarker.data = {
                    "type": "FeatureCollection",
                    "features": [polygonFeature]
                };
                that.map.addSource(polygonID, areaMarker);

                // if dataset loaded, insert areas before dataset layer
                if (that.map.getLayer("chunk_1")) {
                    that.map.addLayer({
                        "id": id,
                        "type": "fill",
                        "source": id,
                        "paint": {
                            "fill-color": "rgba(0, 0, 255, 0.0)",
                            "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                        }
                    }, "chunk_1");
                    that.map.addLayer({
                        "id": polygonID,
                        "type": "line",
                        "source": polygonID,
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        "paint": {
                            "line-color": "rgba(0, 0, 255, 1.0)",
                            "line-width": 10
                        }
                    }, "chunk_1");
                } else {
                    that.map.addLayer({
                        "id": id,
                        "type": "fill",
                        "source": id,
                        "paint": {
                            "fill-color": "rgba(0, 0, 255, 0.0)",
                            "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                        }
                    });
                    that.map.addLayer({
                        "id": polygonID,
                        "type": "line",
                        "source": polygonID,
                        "paint": {
                            "line-color": "rgba(0, 0, 255, 1.0)",
                            "line-width": 10
                        }
                    });
                }

                searchFormController.generateMatchingAreaHTML(attributes, feature);
            };

            // make search form table highlight on hover
            $("#search-form-results-table tr").hover(function() {
                $(this).css({ "background-color": "rgba(0, 86, 173, 0.5)" });
            }, function() {
                $(this).css({ "background-color": "white" });
            });

            $("#search-form-results-table").trigger("update");
            that.areaFeatures = features;

            // add the markers representing the available areas
            areaMarker.data = {
                "type": "FeatureCollection",
                "features": features
            };
        });
    };

    this.loadAreaMarkers = function() {
        that.loadAreaMarkersExcluding(null);
    };

    this.removeAreaMarkers = function() {
        for (var i = 0; i < that.areaFeatures.length; i++) {
            // see why we can't remove source here as well...
            that.map.removeLayer(myMap.areaFeatures[i].properties.layerID);
            // remove fill layer allowing highlighting of our line string hacked
            // polygons
            that.map.removeLayer(myMap.areaFeatures[i].properties.layerID + "fill");
        }

        that.areaFeatures = [];
    };

    // until mapbox api gives us a way to determine when all points of mbtiles
    // have finished fully rendering. TODO: use this instead of timers when
    // endless render loop bug is fixed.
    this.onDatasetRendered = function(callback) {
        var renderHandler = function() {
            if (that.map.loaded()) {
                callback(renderHandler);
            }
        };
        that.map.on("render", renderHandler);
    };

    this.addMapToPage = function(containerID) {
        that.map = new mapboxgl.Map({
            container: containerID, // container id
            center: that.startingCoords, // that.starting position
            zoom: that.startingZoom // that.starting zoom
        });

        that.map.on("load", function() {
            that.selector = new SquareSelector(that);
            that.loadAreaMarkers();
        });

        that.setBaseMapLayer("streets");

        that.map.addControl(new mapboxgl.NavigationControl());

        // disable rotation gesture
        that.map.dragRotate.disable();
        // and box zoom
        that.map.boxZoom.disable();

        that.map.on('click', that.clickOnAnAreaMarker);

        //that.map.on("contextmenu", that.rightClickOnAPoint);

        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        // mainly used to show available areas under a marker
        that.map.on('mousemove', function(e) {
            var features = that.map.queryRenderedFeatures(e.point);
            that.map.getCanvas().style.cursor =
                (features.length && !(features[0].layer.id == "contours") && !(features[0].layer.id == "contour_label")) ? 'pointer' : '';

            // mouse not under a marker, clear all popups
            if (!features.length) {
                that.areaPopup.remove();
                that.gpsStationNamePopup.remove();
                that.areaMarkerLayer.resetHighlightsOfAllMarkers();
                that.areaMarkerLayer.resetHighlightsOfAllAreaRows();
                return;
            }

            var markerSymbol = features[0].properties["marker-symbol"];
            var frameFeature = that.getFirstPolygonFrameAtPoint(features);

            if (!frameFeature) {
                that.areaMarkerLayer.resetHighlightsOfAllMarkers();
                that.areaMarkerLayer.resetHighlightsOfAllAreaRows();
                return;
            }
            // a better way is to have two mousemove callbacks like we do with select area vs select marker
            if (features[0].layer.id == "gpsStations") {
                that.gpsStationNamePopup.remove();
                var coordinates = features[0].geometry.coordinates;
                that.gpsStationNamePopup.setLngLat(coordinates)
                    .setHTML(features[0].properties.stationName)
                    .addTo(that.map);

                return;
            }

            // we have a frame feature so...
            // Populate the areaPopup and set its coordinates
            // based on the feature found.
            var html = "<table class='table' id='areas-under-mouse-table'>";
            // make the html table
            var previewButtonIDSuffix = "_preview_attribues";

            that.areaMarkerLayer.resetHighlightsOfAllMarkers();
            that.areaMarkerLayer.resetHighlightsOfAllAreaRows();
            that.areaMarkerLayer.setAreaRowHighlighted(frameFeature.properties.unavco_name);
            that.areaMarkerLayer.setPolygonHighlighted(frameFeature.properties.layerID, "rgba(0, 0, 255, 0.3)");
        });

        that.map.on('zoomend', function() {
            var currentZoom = that.map.getZoom();

            // reshow area markers once we zoom out enough
            if (currentZoom < that.zoomOutZoom) {
                if (that.pointsLoaded()) {
                    that.reset();
                    // otherwise, points aren't loaded, but area previously was active
                } else if (that.anAreaWasPreviouslyLoaded()) {
                    that.removeAreaPopups();
                    that.loadAreaMarkers();
                    // remove click listener for selecting an area, and add new one for clicking on a point
                    that.map.off("click", that.leftClickOnAPoint);
                    that.map.on('click', that.clickOnAnAreaMarker);
                }
            }

            if (that.map.getSource("onTheFlyJSON")) {
                // it doesn't fire render events if we zoom out, so we recolor anyways when we zoom
                // out. but what about the cases when it does refire? then we have incomplete recoloring.
                // TODO: investigate and fix
                if (currentZoom < that.previousZoom) {
                    that.selector.recolorDataset();
                } else {
                    that.onDatasetRendered(function(renderCallback) {
                        if (!that.selector.recoloring()) {
                            that.selector.recolorDataset();
                        }

                        that.map.off("render", renderCallback);
                    });
                }
            }

            that.previousZoom = currentZoom;
        });
    };

    this.pointsLoaded = function() {
        return that.map.getSource("vector_layer_") != null;
    };

    this.anAreaWasPreviouslyLoaded = function() {
        return that.tileJSON != null;
    };

    this.removePoints = function() {
        if (!that.pointsLoaded()) {
            return;
        }

        that.map.removeSource("vector_layer_");

        for (var i = 1; i <= currentArea.properties.num_chunks; i++) {
            that.map.removeLayer("chunk_" + i);
        }

        // remove all layers but the first, base layer
        that.layers_ = that.layers_.slice(0, 1);

        if (that.map.getSource("onTheFlyJSON")) {
            that.map.removeSource("onTheFlyJSON");
            that.map.removeLayer("onTheFlyJSON");
        }
    }

    this.removeTouchLocationMarkers = function() {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        var layerID = "Top Graph";
        if (that.map.getLayer(layerID)) {
            that.map.removeLayer(layerID);
            that.map.removeSource(layerID);

            that.clickLocationMarker = {
                type: "geojson",
                data: {}
            };
        }

        layerID = "Bottom Graph";
        if (that.map.getLayer(layerID)) {
            that.map.removeLayer(layerID);
            that.map.removeSource(layerID);

            that.clickLocationMarker2 = {
                type: "geojson",
                data: {}
            };
        }
    };

    this.removeAreaPopups = function() {
        // remove popup which shows area attributes
        if ($('.wrap#area-attributes-div').hasClass('active')) {
            $('.wrap#area-attributes-div').toggleClass('active');
        }
        // and the graphs
        if ($('.wrap#charts').hasClass('active')) {
            $('.wrap#charts').toggleClass('active');
        }

        // and color scale
        if ($("#color-scale").hasClass("active")) {
            $("#color-scale").toggleClass("active");
        }
    };

    this.reset = function() {
        that.removePoints();
        that.removeTouchLocationMarkers();
        // incase they are up
        that.elevationPopup.remove();
        that.gpsStationPopup.remove();
        that.gpsStationNamePopup.remove();

        that.removeGPSStationMarkers();
        gpsStationsToggleButton.set("off");

        that.loadAreaMarkers();

        // remove old click listeners, and add new one for clicking on an area marker
        that.map.off("click", that.leftClickOnAPoint);
        that.map.off("click", that.clickOnAnAreaMarker);

        that.map.on('click', that.clickOnAnAreaMarker);

        that.removeAreaPopups();

        $("#point-details").empty();

        overlayToggleButton.set("off");
        that.tileJSON = null;
    };

    this.addContourLines = function() {
        that.map.addLayer({
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
        that.map.addLayer({
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
        that.map.removeLayer("contours");
        that.map.removeLayer("contour_label");
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
        var stops = that.colorScale.getMapboxStops();

        that.layers_.forEach(function(layer) {
            if (that.map.getPaintProperty(layer.id, "circle-color")) {
                that.map.setPaintProperty(layer.id, "circle-color", {
                    property: 'm',
                    stops: stops
                });
            }
        });

        if (that.map.getLayer("onTheFlyJSON")) {
            that.map.setPaintProperty("onTheFlyJSON", "circle-color", {
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
        that.map.addSource(layerID, mapboxStationFeatures);
        that.map.addLayer({
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

        if (that.map.getSource(layerID)) {
            that.map.removeSource(layerID);
        }

        if (that.map.getLayer(layerID)) {
            that.map.removeLayer(layerID);
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
