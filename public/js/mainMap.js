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
        console.log("it is");
        console.log(e.point);
        var features = that.map.queryRenderedFeatures(e.point);

        // var layerID = "touchLocation";

        if (!features.length) {
            return;
        }

        var feature = features[0];
        console.log(feature);

        // clicked on area marker, reload a new area.
        if (feature.properties["marker-symbol"] == "marker" && that.anAreaWasPreviouslyLoaded()) {
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

                            that.selector.recolorDataset();
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

        var layerID = "touchLocation";

        // remove cluster count check if you remove clustering
        if (!features.length || features[0].layer.id == "cluster-count" || features[0].layer.id == "contours" || features[0].layer.id == "contour_label") {
            return;
        }

        that.determineZoomOutZoom();

        var feature = features[0];

        console.log(feature);
        var unavco_name = feature.properties.unavco_name;
        var project_name = feature.properties.project_name;
        var lat = feature.geometry.coordinates[0];
        var long = feature.geometry.coordinates[1];
        var num_chunks = feature.properties.num_chunks;
        var attributeKeys = feature.properties.attributekeys;
        var attributeValues = feature.properties.attributevalues;

        var markerID = feature.properties.layerID;

        // console.log(attributeKeys);
        // console.log(attributeValues);
        // console.log(feature.properties);

        getGEOJSON(feature);
    };

    // extremas: current min = -0.02 (blue), current max = 0.02 (red)
    this.initLayer = function(data, mapType) {
        var layer;
        var layerList = document.getElementById('layerList');
        var stops = that.colorScale.getMapboxStops();

        data['vector_layers'].forEach(function(el) {
            that.layers_.push({
                id: el['id'] + Math.random(),
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
            });
        });
        var tileset = 'mapbox.' + mapType;
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
                },
                'vector_layer_': {
                    type: 'vector',
                    tiles: data['tiles'],
                    minzoom: data['minzoom'],
                    maxzoom: data['maxzoom'],
                    bounds: data['bounds']
                }
            },
            layers: that.layers_
        });

        // remove click listener for selecting an area, and add new one for clicking on a point
        that.map.off("click", that.clickOnAnAreaMarker);
        that.map.on('click', that.leftClickOnAPoint);

        return layer;
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

            for (var i = 0; i < json.areas.length; i++) {
                var area = json.areas[i];

                if (toExclude != null && toExclude.indexOf(area.unavco_name) != -1) {
                    continue;
                }

                var lat = area.coords.latitude;
                var long = area.coords.longitude;
                console.log(area);

                var id = "areas" + i;

                that.areaMarkerLayer.addLayer(id);

                var feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lat, long]
                    },
                    "properties": {
                        "marker-symbol": "marker",
                        "layerID": id,
                        "unavco_name": area.unavco_name,
                        "region": area.region,
                        "project_name": area.project_name,
                        "num_chunks": area.num_chunks,
                        "country": area.country,
                        "decimal_dates": area.decimal_dates,
                        "attributekeys": area.attributekeys,
                        "attributevalues": area.attributevalues,
                        "extra_attributes": area.extra_attributes
                    }
                };

                features.push(feature);

                // add the markers representing the available areas
                areaMarker.data = {
                    "type": "FeatureCollection",
                    "features": [feature]
                };

                if (that.map.getSource(id)) {
                    that.map.removeSource(id);
                }

                if (that.map.getLayer(id)) {
                    that.map.removeLayer(id);
                }

                that.map.addSource(id, areaMarker);

                that.map.addLayer({
                    "id": id,
                    "type": "symbol",
                    "source": id,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                        "icon-allow-overlap": true
                    }
                });
            };

            that.areaFeatures = features;

            // add the markers representing the available areas
            areaMarker.data = {
                "type": "FeatureCollection",
                "features": features
            };

            // clustering
            var layers = [
                [150, '#f28cb1'],
                [20, '#f1f075'],
                [0, '#51bbd6']
            ];

            layers.forEach(function(layer, i) {
                that.map.addLayer({
                    "id": "cluster-" + i,
                    "type": "circle",
                    "source": id,
                    "paint": {
                        "circle-color": layer[1],
                        "circle-radius": 10
                    },
                    "filter": i == 0 ? [">=", "point_count", layer[0]] : ["all", [">=", "point_count", layer[0]],
                        ["<", "point_count", layers[i - 1][0]]
                    ]
                });
            });

            // Add a layer for the clusters' count labels
            that.map.addLayer({
                "id": "cluster-count",
                "type": "symbol",
                "source": id,
                "layout": {
                    "text-field": "{point_count}",
                    "text-font": [
                        "DIN Offc Pro Medium",
                        "Arial Unicode MS Bold"
                    ],
                    "text-size": 12
                }
            });
        });
    };

    this.loadAreaMarkers = function() {
        that.loadAreaMarkersExcluding(null);
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
            that.loadGPSStationsMarkers(gpsStations);
        });

        var tileset = 'mapbox.streets';
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
                that.areaMarkerLayer.resetSizeOfModifiedMarkers();
                return;
            }

            // if it's a select area marker, but not a selected point marker... I suppose this is hackish
            // a better way is to have two mousemove callbacks like we do with select area vs select marker
            var markerSymbol = features[0].properties["marker-symbol"];
            if (markerSymbol != null && typeof markerSymbol != "undefined" && markerSymbol == "marker") {
                // Populate the areaPopup and set its coordinates
                // based on the feature found.
                var html = "<table class='table' id='areas-under-mouse-table'>";
                // make the html table
                var previewButtonIDSuffix = "_preview_attribues";

                features = that.getMarkersAtSameLocationAsMarker(features[0], features);

                for (var i = 0; i < features.length; i++) {
                    var unavco_name = features[i].properties.unavco_name;

                    if (!unavco_name) {
                        return;
                    }

                    var markerID = features[i].properties.layerID;

                    that.areaMarkerLayer.setMarkerSize(markerID, 1.5);

                    var region = features[i].properties.region;

                    var prettyNameAndComponents = that.prettyPrintProjectName(features[i].properties.project_name);
                    var attributeValues = JSON.parse(features[i].properties.attributevalues);
                    var first_date_index = JSON.parse(features[i].properties.attributekeys).indexOf("first_date");

                    var first_date = attributeValues[first_date_index];
                    var last_date = attributeValues[first_date_index + 1];

                    var frameNumbersString = null;

                    if (prettyNameAndComponents.frameNumbers[0] == prettyNameAndComponents.frameNumbers[1]) {
                        frameNumbersString = prettyNameAndComponents.frameNumbers[0];
                    } else {
                        frameNumbersString = prettyNameAndComponents.frameNumbers.join(" ");
                    }

                    html += "<tr><td value='" + unavco_name + "'><div class='area-name-popup' id='" + unavco_name + "' data-html='true' data-toggle='tooltip'" + " title='" + first_date + " to " + last_date + "<br>" +
                        prettyNameAndComponents.missionType + " T" + prettyNameAndComponents.trackNumber + " " + frameNumbersString + "' data-placement='left'>" + region + " " + prettyNameAndComponents.missionSatellite +
                        " " + prettyNameAndComponents.missionType + "</div><div class='preview-attributes-button clickable-button' id=" + unavco_name + previewButtonIDSuffix + "><b>?</div></td></tr>";
                }
                html += "</table>";
                that.areaPopup.setLngLat(features[0].geometry.coordinates)
                    .setHTML(html).addTo(that.map);
                // make table respond to clicks
                for (var i = 0; i < features.length; i++) {
                    var unavco_name = features[i].properties.unavco_name;

                    if (!unavco_name) {
                        return;
                    }

                    var project_name = features[i].properties.project_name;
                    var lat = features[i].geometry.coordinates[0];
                    var long = features[i].geometry.coordinates[1];

                    var num_chunks = features[i].properties.num_chunks;

                    var attributeKeys = features[i].properties.attributekeys;
                    var attributeValues = features[i].properties.attributevalues;

                    // make cursor change when mouse hovers over row
                    $("#areas-under-mouse-table #" + unavco_name).css("cursor", "pointer");
                    $(".preview-attributes-button").css({
                        "cursor": "pointer",
                        "border-radius": "100%",
                        "background-color": "rgb(107, 190, 249)"
                    });

                    $("#" + unavco_name).css({
                        "width": "90%",
                        "float": "left",
                        "padding-right": "10px"
                    });

                    // ugly click function declaration to JS not using block scope
                    $("#" + unavco_name).click((function(area) {
                        return function(e) {
                            that.determineZoomOutZoom();
                            clickedArea = area.properties.unavco_name;
                            that.areaPopup.remove();
                            getGEOJSON(area);
                        };
                    })(features[i]));
                    $("#" + unavco_name + previewButtonIDSuffix).hover((function(area) {
                        return function(e) {
                            if ($('.wrap#area-attributes-div').hasClass('active')) {
                                areaAttributesPopup.populate(area);
                            } else {
                                areaAttributesPopup.show(area);
                            }
                        };
                    })(features[i]), function() {
                        $('.wrap#area-attributes-div').toggleClass('active');
                    });
                }

                $(".preview-attributes-button").css({
                    "width": "15px",
                    "float": "left"
                });

                $(".area-name-popup").tooltip(); // activate tooltips
                prepareButtonsToHighlightOnHover();
            }
        });

        // handle zoom changed. we want to change the icon-size in the layer for varying zooms.
        // if you notice, in tremaps, all the points are just one size, as if they were real, physical points.
        // so, when you zoom out, the points appear to be smaller than when you are zoomed in. with the markers
        // we are using, though, the marker icons are always the same size, so we can use that function to
        // dynamically change the sizes depending on the current map zoom.
        that.map.on('zoomend', function() {
            console.log(that.map.getZoom());

            if (that.selector.bbox != null) {
                that.selector.recolorDataset();
            }

            // reshow area markers once we zoom out enough
            if (that.map.getZoom() < that.zoomOutZoom) {
                if (that.pointsLoaded()) {
                    that.reset();
                    // otherwise, points aren't loaded, but area previously was active
                } else if (that.anAreaWasPreviouslyLoaded()) {
                    that.removeAreaPopups();
                    that.loadAreaMarkers();
                    // remove click listener for selecting an area, and add new one for clicking on a point
                    that.map.off("click");
                    that.map.on('click', that.clickOnAnAreaMarker);
                }
            }
        });
    };

    this.pointsLoaded = function() {
        return that.map.getSource("vector_layer_") != null;
    };

    this.anAreaWasPreviouslyLoaded = function() {
        return that.tileJSON != null;
    };

    this.removePoints = function() {
        that.map.removeSource("vector_layer_");

        for (var i = 0; i < that.layers_.length; i++) {
            var id = that.layers_[i].id;

            // don't remove the base map, only the points
            if (id !== "simple-tiles") {
                that.map.removeLayer(id);
            }
        }

        // remove contour labels if they are there. this wasn't needed as gl js seemed to remove the contours in the above loop
        // now it doesn't, causing a crash if we disable data overlay
        // and then disable contour lines
        if (that.map.getLayer("contours")) {
            that.removeContourLines();
        }
        // remove all layers but the first, base layer
        that.layers_ = that.layers_.slice(0, 1);

        // re add contours otherwise crash and map freezes as gl js removes it when we remove the points
        if (contourToggleButton.toggleState == ToggleStates.ON) {
            that.addContourLines();
        }

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
        that.elevationPopup.remove(); // incase it's up

        that.loadAreaMarkers();

        // remove click listener for selecting an area, and add new one for clicking on a point
        that.map.off("click");
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

    this.loadGPSStationsMarkers = function(stations) {
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
            var popupHTML = '<h1>Station: ' + stations[i][0] + '<br/>' +
                ' <a href="http://geodesy.unr.edu/NGLStationPages/stations/' + stations[i][0] + '.sta"> ' +
                ' <img src="http://geodesy.unr.edu/tsplots/' + stations[i][3] + '/TimeSeries/' + stations[i][0] + '.png" align="center" width=400 alt="' + stations[i][0] + 'Time Series Plot"/> </a>' +
                ' <p> <h5> Click plot for full station page. Positions in ' + stations[i][3] + ' reference frame. ';

            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [stations[i][2], stations[i][1]]
                },
                "properties": {
                    "marker-symbol": "square",
                    "popupHTML": popupHTML
                }
            };

            features.push(feature);
        }
        mapboxStationFeatures.data.features = features;

        var layerID = "gpsStations";
        that.map.addSource(layerID, mapboxStationFeatures);
        that.map.addLayer({
            "id": layerID,
            "type": "symbol",
            "source": layerID,
            "layout": {
                "icon-image": "{marker-symbol}-15",
                "icon-allow-overlap": true
            }
        });
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
