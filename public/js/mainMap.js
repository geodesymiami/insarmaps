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
        var date = new Date(year, month, day);
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

// convert date in decimal - for example, 20060131 is Jan 31, 2006
// 31 days have passed so decimal format = [2006 + (31/365)] = 2006.0849
// take an array of date objects and return an array of date decimals
var convertDatesToDecimalArray = function(date_array) {
    var decimals = [];
    for (i = 0; i < date_array.length; i++) {
        decimals.push(date_array[i].getFullYear() + getDaysElapsed(date_array[i]) / 365);
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
        data.push([Date.UTC(year, month, day), displacements[i]]);
    }
    return data;
}

function Map(loadJSONFunc) {
    var that = this;
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.geoDataMap = {};
    this.layers_ = [];
    this.loadJSONFunc = loadJSONFunc;
    this.tileURLID = "kjjj11223344.4avm5zmh";
    this.tileJSON = null;
    this.clickLocationMarker = new mapboxgl.GeoJSONSource();
    this.clickLocationMarker2 = new mapboxgl.GeoJSONSource();
    this.selector = null;
    this.zoomOutZoom = 7.0;
    this.graphsController = new GraphsController();
    this.areas = null;
    this.areaFeatures = null;

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
        var features = that.map.queryRenderedFeatures(e.point, {
            layers: that.layers
        });

        // var layerID = "touchLocation";

        if (!features.length) {
            return;
        }

        var feature = features[0];
        console.log(feature);

        var long = feature.geometry.coordinates[0];
        var lat = feature.geometry.coordinates[1];
        var pointNumber = feature.properties.p;

        if (pointNumber === undefined || pointNumber === null || feature.layer.id == "contours" || feature.layer.id == "contour_label") {
            return;
        }

        var title = pointNumber.toString();
        var query = {
            "area": currentArea.name,
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

        clickMarker.setData({
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
        });
        // show cross on clicked point
        if (!that.map.getLayer(layerID)) {
            that.map.addSource(layerID, clickMarker);
            // already there? then remove it as we are going to add a new layer every time
            // so geojson sources overlayed on top of the vector tiles don't obscure our crosses
        } else {
            that.map.removeLayer(layerID);
        }

        that.map.addLayer({
            "id": layerID,
            "type": "symbol",
            "source": layerID,
            "layout": {
                "icon-image": "{marker-symbol}-15",
            }
        });

        $("#point-details").html(lat.toFixed(5) + ", " + long.toFixed(5));

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
                                var displacements_array = detrendToggleButton.toggleState == ToggleStates.ON ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
                                that.graphsController.addRegressionLine(chartContainer, displacements_array);
                            }

                            that.selector.recolorMap();
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
                    pointFormat: '{point.x:%e. %b %Y}: {point.y:.6f} m'
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
                    $("#point-details").append("<br>Elevation: " + results[0].elevation.toFixed(0) + " meters");
                } else {
                    console.log(status);
                }
            });
        });
    };

    this.leftClickOnAPoint = function(e) {
        that.clickOnAPoint(e);
    };

    this.rightClickOnAPoint = function(e) {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            that.clickOnAPoint(e);
        }
    };

    this.clickOnAnAreaMaker = function(e) {
        var features = that.map.queryRenderedFeatures(e.point, {
            layers: that.layers
        });

        var layerID = "touchLocation";

        // remove cluster count check if you remove clustering
        if (!features.length || features[0].layer.id == "cluster-count" || features[0].layer.id == "contours" || features[0].layer.id == "contour_label") {
            return;
        }

        // memorize the zoom we clicked at, but only if it's more zoomed out than
        // the flyTo zoom when an area is loaded
        var currentZoom = that.map.getZoom();
        if (currentZoom <= 7.0) {
            // prevent zoom below 1.0, as floating point inaccuracies can cause bugs at most zoomed out level
            if (currentZoom <= 1.0) {
                that.zoomOutZoom = 1.0;
            } else {
                that.zoomOutZoom = that.map.getZoom();
            }
        }

        var feature = features[0];

        console.log(feature);
        var areaName = feature.properties.name;
        var lat = feature.geometry.coordinates[0];
        var long = feature.geometry.coordinates[1];
        var num_chunks = feature.properties.num_chunks;
        var attributeKeys = feature.properties.attributekeys;
        var attributeValues = feature.properties.attributevalues;

        // needed as mapbox doesn't return original feature
        var markerArea = {
            "name": areaName,
            "coords": {
                "latitude": lat,
                "longitude": long,
            },
            "num_chunks": num_chunks,
            "attributekeys": attributeKeys,
            "attributevalues": attributeValues
        };

        getGEOJSON(markerArea);
    };

    // extremas: current min = -0.02 (blue), current max = 0.02 (red)
    this.initLayer = function(data, mapType) {
        var layer;
        var layerList = document.getElementById('layerList');

        data['vector_layers'].forEach(function(el) {
            that.layers_.push({
                id: el['id'] + Math.random(),
                source: 'vector_layer_',
                'source-layer': el['id'],
                interactive: true,
                type: 'circle',
                layout: {
                    'visibility': 'visible'
                },
                paint: {
                    'circle-color': {
                        property: 'm',
                        stops: [
                            [-0.02, '#0000FF'], // blue
                            [-0.01, '#00FFFF'], // cyan
                            [0.0, '#01DF01'], // lime green
                            [0.01, '#FFBF00'], // yellow orange
                            [0.02, '#FF0000'] // red orange
                        ]
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
            sprite: "/maki/makiIcons",
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
        that.map.off("click");
        that.map.on('click', that.leftClickOnAPoint);

        return layer;
    }

    this.loadAreaMarkers = function() {
        loadJSONFunc("", "areas", function(response) {
            var json = JSON.parse(response);
            that.areas = json;

            var areaMarker = new mapboxgl.GeoJSONSource({
                cluster: false,
                clusterRadius: 10
            });
            var features = [];

            for (var i = 0; i < json.areas.length; i++) {
                var area = json.areas[i];
                var lat = area.coords.latitude;
                var long = area.coords.longitude;
                console.log(area);

                var feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lat, long]
                    },
                    "properties": {
                        "marker-symbol": "marker",
                        "name": area.name,
                        "num_chunks": area.num_chunks,
                        "attributekeys": area.attributekeys,
                        "attributevalues": area.attributevalues
                    }
                };

                features.push(feature);
            };

            that.areaFeatures = features;

            // add the markers representing the available areas
            areaMarker.setData({
                "type": "FeatureCollection",
                "features": features
            });
            var id = "areas";

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

    this.addMapToPage = function(containerID) {
        that.map = new mapboxgl.Map({
            container: containerID, // container id
            center: [0, 0], // that.starting position
            zoom: 0 // that.starting zoom
        });

        that.map.on("load", function() {
            that.selector = new LineSelector(that);//new SquareSelector(that);
            that.loadAreaMarkers();
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
            sprite: "/maki/makiIcons",
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

        that.map.addControl(new mapboxgl.Navigation());

        // disable rotation gesture
        that.map.dragRotate.disable();
        // and box zoom
        that.map.boxZoom.disable();

        that.map.on('click', that.clickOnAnAreaMaker);

        //that.map.on("contextmenu", that.rightClickOnAPoint);

        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        that.map.on('mousemove', function(e) {
            var features = that.map.queryRenderedFeatures(e.point, { layers: that.layers });
            that.map.getCanvas().style.cursor =
                (features.length && !(features[0].layer.id == "contours") && !(features[0].layer.id == "contour_label")) ? 'pointer' : '';

            if (!features.length) {
                that.areaPopup.remove();
                return;
            }
            // if it's a select area marker, but not a selected point marker... I suppose this is hackish
            // a better way is to have two mousemove callbacks like we do with select area vs select marker
            var markerSymbol = features[0].properties["marker-symbol"];

            if (markerSymbol != null && typeof markerSymbol != "undefined" && markerSymbol != "cross" && markerSymbol != "crossRed") {
                // Populate the areaPopup and set its coordinates
                // based on the feature found.

                var html = "<table class='table' id='areas-under-mouse-table'>";
                // make the html table
                for (var i = 0; i < features.length; i++) {
                    var areaName = features[i].properties.name;
                    html += "<tr id='" + areaName + "'><td value='" + areaName + "'>" + areaName + "</td></tr>";
                }
                html += "</table>";
                that.areaPopup.setLngLat(features[0].geometry.coordinates)
                    .setHTML(html).addTo(that.map);
                // make table respond to clicks
                for (var i = 0; i < features.length; i++) {
                    var areaName = features[i].properties.name;
                    var lat = features[i].geometry.coordinates[0];
                    var long = features[i].geometry.coordinates[1];
                    var num_chunks = features[i].properties.num_chunks;

                    var attributeKeys = features[i].properties.attributekeys;
                    var attributeValues = features[i].properties.attributevalues;

                    var markerArea = {
                        "name": areaName,
                        "coords": {
                            "latitude": lat,
                            "longitude": long,
                        },
                        "num_chunks": num_chunks,
                        "attributekeys": attributeKeys,
                        "attributevalues": attributeValues
                    };

                    // make cursor change when mouse hovers over row
                    $("#areas-under-mouse-table #" + areaName).css("cursor", "pointer");
                    // ugly click function declaration to JS not using block scope
                    $("#areas-under-mouse-table #" + areaName).click((function(area) {
                        return function(e) {
                            // don't load area if reference link is clicked
                            if (e.target.cellIndex == 0) {
                                clickedArea = area.name;
                                that.areaPopup.remove();
                                getGEOJSON(area);
                            }
                        };
                    })(markerArea));
                }
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
                that.selector.recolorMap();
            }

            // reshow area markers once we zoom out enough
            if (that.map.getZoom() <= that.zoomOutZoom) {
                if (that.pointsLoaded()) {
                    that.reset();
                    // otherwise, points aren't loaded, but area previously was active
                } else if (that.tileJSON != null) {
                    that.removeAreaPopups();
                    that.loadAreaMarkers();
                    // remove click listener for selecting an area, and add new one for clicking on a point
                    that.map.off("click");
                    that.map.on('click', that.clickOnAnAreaMaker);
                }
            }
        });
    };

    this.pointsLoaded = function() {
        return that.map.getSource("vector_layer_") != null;
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

            that.clickLocationMarker = new mapboxgl.GeoJSONSource();
        }

        layerID = "Bottom Graph";
        if (that.map.getLayer(layerID)) {
            that.map.removeLayer(layerID);
            that.map.removeSource(layerID);

            that.clickLocationMarker2 = new mapboxgl.GeoJSONSource();
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
        myMap.removePoints();
        myMap.removeTouchLocationMarkers();
        myMap.elevationPopup.remove(); // incase it's up

        that.loadAreaMarkers();

        // remove click listener for selecting an area, and add new one for clicking on a point
        that.map.off("click");
        that.map.on('click', that.clickOnAnAreaMaker);

        that.removeAreaPopups();

        overlayToggleButton.set("off");
        myMap.tileJSON = null;
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

var myMap = new Map(loadJSON);
myMap.addMapToPage("map-container");
