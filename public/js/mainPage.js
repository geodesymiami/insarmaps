function getGEOJSON(area) {
    // currentPoint = 1;
    currentArea = area;

    // var query = {
    //   "area": area,
    //   "fileChunk": currentPoint
    // }

    // loadJSON(query, "file", myMap.JSONCallback);
    //var tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://localhost:8888/t/{z}/{x}/{y}.pbf"], "vector_layers":[]};
    //myMap.tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://localhost:8888/" + area + "/{z}/{x}/{y}.pbf"], "vector_layers":[]};
    myMap.tileJSON = { "minzoom": 0, "maxzoom": 14, "center": [130.308838, 32.091882, 14], "bounds": [130.267778, 31.752321, 131.191112, 32.634544], "tiles": ["http://ec2-52-41-231-16.us-west-2.compute.amazonaws.com:8888/" + area.name + "/{z}/{x}/{y}.pbf"], "vector_layers": [] };

    if (myMap.pointsLoaded()) {
        myMap.removePoints();
        myMap.removeTouchLocationMarkers();
    }

    // make streets toggle button be only checked one
    $("#streets").prop("checked", true);

    for (var i = 1; i <= area.num_chunks; i++) {
        var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
        myMap.tileJSON.vector_layers.push(layer);
    }

    $('.wrap#area-attributes-div').toggleClass('active');

    // $(".wrap#area-attributes-div").find(".content").find("#Attr1").empty();
    var tableHTML = "";
    var attributekeys = null;
    var attributevalues = null;

    // if we click on an area marker, we get a string as the mapbox feature can't seem to store an array and converts it to a string
    if (typeof area.attributekeys == "string" || typeof area.attributevalues == "string") {
        attributekeys = area.attributekeys.split(",");
        attributevalues = area.attributevalues.split(",");
        // otherwise, we get arrays from the server (clicked on area not through an area marker feature)
    } else {
        attributekeys = area.attributekeys;
        attributevalues = area.attributevalues;
    }

    // set like object
    var attributesToDisplay = {
        "mission": true,
        "beam_mode": true,
        "beam_swath": true,
        "relative_orbit": true,
        "first_date": true,
        "last_date": true,
        "processing_type": true,
        "processing_software": true,
        "history": true,
        "first_frame": true,
        "last_frame": true,
        "flight_direction": true,
        "look_direction": true,
        "atmos_correct_method": true,
        "unwrap_method": true,
        "post_processing_method": true
    };

    for (var i = 0; i < attributekeys.length; i++) {
        curKey = attributekeys[i];

        if (curKey in attributesToDisplay) {
            curValue = attributevalues[i];

            tableHTML += "<tr><td value=" + curKey + ">" + curKey + "</td>";
            tableHTML += "<td value=" + curValue + ">" + curValue + "</td></tr>";
        }
    }

    $("#color-scale").toggleClass("active");

    $("#area-attributes-table-body").html(tableHTML);

    myMap.initLayer(myMap.tileJSON, "streets");
    myMap.map.style.on("load", function() {
        overlayToggleButton.set("on");
        if (contourToggleButton.toggleState == ToggleStates.ON) {
            myMap.addContourLines();
        }

        window.setTimeout(function() {
            myMap.map.flyTo({
                center: [area.coords.latitude, area.coords.longitude],
                zoom: 7
            });
        }, 1000);
    });
}

function goToTab(event, id) {
    // first clear any visible tab
    $(".tabcontent").each(function(index, obj) {
        obj.style.display = "none";
    });
    $(".tablinks").each(function(index, obj) {
        obj.className = obj.className.replace(" active", "");
    });

    $("#" + id).css("display", "block");
    event.currentTarget.className += " active"
}

function ToggleButton(id) {
    var that = this;
    this.id = id;
    this.toggleState = $(this.id).prop('checked') ? ToggleStates.ON : ToggleStates.OFF;
    this.onclick = null;
    this.firstToggle = true;

    this.toggle = function() {
        if (that.toggleState == ToggleStates.ON) {
            that.toggleState = ToggleStates.OFF;
            $(this.id).prop('checked', false);
        } else {
            that.toggleState = ToggleStates.ON;
            $(this.id).prop('checked', true);
        }
    };

    this.set = function(state) {
        if (state == "on") {
            if (that.toggleState == ToggleStates.OFF) {
                that.toggle();
            }
        } else if (state == "off") {
            if (that.toggleState == ToggleStates.ON) {
                that.toggle();
            }
        } else {
            console.log("invalid toggle option");
        }
    }
    this.onclick = function(clickFunction) {
        $(that.id).on("click", function() {
            // toggle states
            that.toggle();

            clickFunction();
        });
    };
}

var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].onclick = function() {
        this.classList.toggle("active");
        this.nextElementSibling.classList.toggle("show");
    }
}

// enum-style object to denote toggle state
var ToggleStates = {
    OFF: 0,
    ON: 1
}

var layerList = document.getElementById('map-type-menu');
var inputs = layerList.getElementsByTagName('input');

/*TOGGLE BUTTON*/
var overlayToggleButton = new ToggleButton("#overlay-toggle-button");
overlayToggleButton.onclick(function() {
    // on? add layers, otherwise remove them
    if (overlayToggleButton.toggleState == ToggleStates.ON) {
        if (!myMap.tileJSON) {
            overlayToggleButton.set("off");
            return;
        }

        $("#overlay-slider").slider("value", 100);
        myMap.map.addSource("vector_layer_", {
            type: 'vector',
            tiles: myMap.tileJSON['tiles'],
            minzoom: myMap.tileJSON['minzoom'],
            maxzoom: myMap.tileJSON['maxzoom'],
            bounds: myMap.tileJSON['bounds']
        });

        // for (var i = 1; i < 24; i++) {
        //     var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
        //     myMap.tileJSON.vector_layers.push(layer);
        // }

        myMap.tileJSON["vector_layers"].forEach(function(el) {
            myMap.layers_.push({
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

        for (var i = 1; i < myMap.layers_.length; i++) {
            var layer = myMap.layers_[i];

            myMap.map.addLayer(layer);
        }

        console.log("added that");
    } else {
        if (myMap.pointsLoaded()) {
            console.log("loaded");
            $("#overlay-slider").slider("value", 0);
            myMap.removePoints();
            myMap.removeTouchLocationMarkers();
        }
    }
});

function switchLayer(layer) {
    var layerId = layer.target.id;

    var tileset = 'mapbox.' + layerId;

    // we assume in this case that an area has been clicked
    if (overlayToggleButton.toggleState == ToggleStates.ON && myMap.tileJSON != null) {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        // if (myMap.map.getLayer(layerID)) {

        // }
        var layerIDTop = "Top Graph";
        var latTop = 0.0;
        var longTop = 0.0;
        var mapHadClickLocationMarkerTop = false;
        var layerIDBot = "Bottom Graph";
        var latBot = 0.0;
        var longBot = 0.0;
        var mapHadClickLocationMarkerBot = false;

        if (myMap.map.getLayer(layerIDTop)) {
            var markerCoords = myMap.clickLocationMarker._data.features[0].geometry.coordinates;
            latTop = markerCoords[0];
            longTop = markerCoords[1];
            mapHadClickLocationMarkerTop = true;

            if (myMap.map.getLayer(layerIDBot)) {
                var markerCoords = myMap.clickLocationMarker2._data.features[0].geometry.coordinates;
                latBot = markerCoords[0];
                longBot = markerCoords[1];
                mapHadClickLocationMarkerBot = true;
            }

            myMap.removeTouchLocationMarkers();
        }

        myMap.map.setStyle({
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
                    tiles: myMap.tileJSON['tiles'],
                    minzoom: myMap.tileJSON['minzoom'],
                    maxzoom: myMap.tileJSON['maxzoom'],
                    bounds: myMap.tileJSON['bounds']
                }
            },
            layers: myMap.layers_
        });

        // finally, add back the click location marker, do on load of style to prevent
        // style not done loading error
        myMap.map.style.on("load", function() {
            if (mapHadClickLocationMarkerTop) {
                myMap.clickLocationMarker.setData({
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [latTop, longTop]
                        },
                        "properties": {
                            "marker-symbol": "cross"
                        }
                    }]
                });
                myMap.map.addSource(layerIDTop, myMap.clickLocationMarker);

                myMap.map.addLayer({
                    "id": layerIDTop,
                    "type": "symbol",
                    "source": layerIDTop,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                    }
                });
            }

            if (mapHadClickLocationMarkerBot) {
                myMap.clickLocationMarker2.setData({
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [latBot, longBot]
                        },
                        "properties": {
                            "marker-symbol": "crossRed"
                        }
                    }]
                });
                myMap.map.addSource(layerIDBot, myMap.clickLocationMarker2);

                myMap.map.addLayer({
                    "id": layerIDBot,
                    "type": "symbol",
                    "source": layerIDBot,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                    }
                });
            }

            // is contour lines clicked?
            if (contourToggleButton.toggleState == ToggleStates.ON) {
                myMap.addContourLines();
            }
        });
    } else {
        myMap.map.setStyle({
            version: 8,
            sprite: "/maki/makiIcons",
            glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
            sources: {
                "raster-tiles": {
                    "type": "raster",
                    "url": "mapbox://" + tileset,
                    "tileSize": 256
                }
            },
            layers: myMap.layers_
        });

        var id = "areas";

        if (myMap.areaFeatures != null) {
            myMap.map.style.on("load", function() {
                var areaMarker = new mapboxgl.GeoJSONSource({
                    cluster: false,
                    clusterRadius: 10
                }); // add the markers representing the available areas
                areaMarker.setData({
                    "type": "FeatureCollection",
                    "features": myMap.areaFeatures
                });
                myMap.map.addSource(id, areaMarker);
                myMap.map.addLayer({
                    "id": id,
                    "type": "symbol",
                    "source": id,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                        "icon-allow-overlap": true
                    }
                });
            });
        }
    }
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
}

// line connecting dots in chart on/off
var dotToggleButton = new ToggleButton("#dot-toggle-button");
dotToggleButton.onclick(function() {
    if (dotToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.connectDots();
    } else {
        myMap.graphsController.disconnectDots();
    }
});

var secondGraphToggleButton = new ToggleButton("#second-graph-toggle-button");
secondGraphToggleButton.onclick(function() {
    if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.prepareForSecondGraph();
    } else {
        myMap.graphsController.removeSecondGraph();
    }
});

var regressionToggleButton = new ToggleButton("#regression-toggle-button");
regressionToggleButton.onclick(function() {
    if (regressionToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.addRegressionLines();
    } else {
        myMap.graphsController.removeRegressionLines();
    }
});

var detrendToggleButton = new ToggleButton("#detrend-toggle-button");
detrendToggleButton.onclick(function() {
    if (detrendToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.detrendData();
    } else {
        myMap.graphsController.removeDetrend();
    }
});

var topGraphToggleButton = new ToggleButton("#top-graph-toggle-button");
topGraphToggleButton.onclick(function() {
    if (topGraphToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.selectedGraph = "Top Graph";
        bottomGraphToggleButton.set("off");
    } else {
        myMap.graphsController.selectedGraph = "Bottom Graph";
    }
});
var bottomGraphToggleButton = new ToggleButton("#bottom-graph-toggle-button");
bottomGraphToggleButton.onclick(function() {
    if (bottomGraphToggleButton.toggleState == ToggleStates.ON) {
        myMap.graphsController.selectedGraph = "Bottom Graph";
        topGraphToggleButton.set("off");
    } else {
        myMap.graphsController.selectedGraph = "Top Graph";
    }
});

var contourToggleButton = new ToggleButton("#contour-toggle-button");
contourToggleButton.onclick(function() {
    if (contourToggleButton.toggleState == ToggleStates.ON) {
        myMap.addContourLines();
    } else {
        myMap.map.removeLayer("contour_label");
        myMap.map.removeLayer("contours");
    }
});

function search() {
    var json = myMap.areas;
    console.log(json);
    if (!$('.wrap#select-area-wrap').hasClass('active')) {
        $('.wrap#select-area-wrap').toggleClass('active');
    }
    if (json != null) {
        // TODO: dummy search for paper, add actual paper later on when we get attribute    
        query = $("#search-input").val();
        // full list of areas
        var areas = json.areas;
        // TODO: remove, this is placeholder
        for (var i = 0; i < areas.length; i++) {
            areas[i].reference = "Chaussard, E., Amelung, F., & Aoki, Y. (2013). Characterization of open and closed volcanic systems in Indonesia and Mexico using InSAR time‐series. Journal of Geophysical Research: Solid Earth, DOI: 10.1002/jgrb.50288";
            // add mission so it's fuse searchable
            areas[i].mission = areas[i].attributevalues[0];
        }
        // new sublist of areas that match query
        var match_areas = [];

        var fuse = new Fuse(areas, { keys: ["country", "name", "region", "mission"] });
        var countries = fuse.search(query);

        console.log("area 1");

        // add our info in a table, first remove any old info
        $(".wrap#select-area-wrap").find(".content").find("#myTable").find("#tableBody").empty();
        for (var i = 0; i < countries.length; i++) {
            var country = countries[i];

            $("#tableBody").append("<tr id=" + country.name + "><td value='" + country.name + "''>" +
                country.name + "</td><td value='reference'><a href='http://www.rsmas.miami.edu/personal/famelung/Publications_files/ChaussardAmelungAoki_VolcanoCycles_JGR_2013.pdf' target='_blank'>" +
                "Chaussard, E., Amelung, F., & Aoki, Y. (2013). Characterization of open and closed volcanic systems in Indonesia and Mexico using InSAR time‐series. Journal of Geophysical Research: Solid Earth, DOI: 10.1002/jgrb.50288.</a></td></tr>");

            // make cursor change when mouse hovers over row
            $("#" + country.name).css("cursor", "pointer");
            // set the on click callback function for this row

            // ugly click function declaration to JS not using block scope
            $("#" + country.name).click((function(country) {
                return function(e) {
                    // don't load area if reference link is clicked
                    if (e.target.cellIndex == 0) {
                        clickedArea = country;
                        console.log(country);
                        $('.wrap#select-area-wrap').toggleClass('active');
                        getGEOJSON(country);
                    }
                };
            })(country));
        }

        // now get only datasets from countries array with query search
        // for (i = 0; i < areas.length; i++) {}

    } else {
        console.log("No such areas");
        $("#tableBody").html("No areas found");
    }
}

// when site loads, turn toggle on
$(window).load(function() {
    var NUM_CHUNKS = 300;

    $('.slideout-menu-toggle').on('click', function(event) {
        event.preventDefault();
        // create menu variables
        var slideoutMenu = $('.slideout-menu');
        var slideoutMenuWidth = $('.slideout-menu').width();

        // toggle open class
        slideoutMenu.toggleClass("open");

        // slide menu
        if (slideoutMenu.hasClass("open")) {
            slideoutMenu.animate({
                left: "0px"
            });
        } else {
            slideoutMenu.animate({
                left: -slideoutMenuWidth
            }, 250);
        }
    });

    $("#graph-div-button").on("click", function(event) {
        $(".wrap#charts").toggleClass("active");
    });

    var oldGraphDivHeight = 0;

    $("#graph-div-minimize-button").on("click", function(event) {
        if ($(".wrap#charts").hasClass("toggled")) {
            $(".wrap#charts").animate({ "height": oldGraphDivHeight }).removeClass("toggled");
            myMap.graphsController.recreateGraphs();
        } else {
            oldGraphDivHeight = $(".wrap#charts").height();
            $(".wrap#charts").animate({ "height": "5%" }).addClass("toggled");
        }
    });

    var oldAttributeDivHeight = 0;

    $("#area-attributes-div-minimize-button").on("click", function(event) {
        if ($(".wrap#area-attributes-div").hasClass("toggled")) {
            $(".wrap#area-attributes-div").animate({ "height": oldAttributeDivHeight }).removeClass("toggled");
        } else {
            oldAttributeDivHeight = $(".wrap#area-attributes-div").height();
            $(".wrap#area-attributes-div").animate({ "height": "5%" }).addClass("toggled");
        }
    });

    // chart div resizable
    $(".wrap#charts").resizable({
        animateDuration: "fast",
        animateEasing: "linear",
        start: function(event, ui) {
            var chart = $("#chartContainer").highcharts();
            var chart2 = $("#chartContainer2").highcharts();
            if (chart !== undefined) {
                chart.destroy();
            }
            if (chart2 !== undefined) {
                chart2.destroy();
            }
        },
        stop: function(event, ui) {
            var chartContainersNewHeight = $(".wrap").find(".content").find("#chart-containers").height();

            if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
                chartContainersNewHeight /= 2;
                // resize chart container div's as they don't resize with jquery resizable
                $("#chartContainer2").height(chartContainersNewHeight);
            }

            // resize chart container div's as they don't resize with jquery resizable
            $("#chartContainer").height(chartContainersNewHeight);

            myMap.graphsController.recreateGraphs();
        }
    }).draggable({
        start: function(event, ui) {
            var chart = $("#chartContainer").highcharts();
            var chart2 = $("#chartContainer2").highcharts();
            if (chart !== undefined) {
                chart.destroy();
            }
            if (chart2 !== undefined) {
                chart2.destroy();
            }
        },
        stop: function(event, ui) {
            myMap.graphsController.recreateGraphs();
        }
    });

    $("#reset-button").on("click", function() {
        if (myMap.pointsLoaded()) {
            myMap.reset();
        }

        myMap.map.flyTo({
            center: [0, 0],
            zoom: 0
        });
    });

    $("#information-button").on("click", function() {
        $("#information-div").toggleClass("active");
    });

    $("#close-information-button").on("click", function() {
        $("#information-div").toggleClass("active");
    });

    $(function() {
        $('[data-toggle="tooltip"]').tooltip()
    });

    $("#polygon-button").on("click", function() {
        myMap.selector.polygonButtonSelected = !myMap.selector.polygonButtonSelected;

        // reset bounding box
        if (!myMap.selector.polygonButtonSelected) {
            myMap.selector.bbox = null;
            // Remove these events now that finish has been called.
            myMap.selector.polygonButtonSelected = false;
            myMap.map.dragPan.enable();
        }

        var buttonColor = "blue";
        var opacity = 0.7;

        if (!myMap.selector.polygonButtonSelected) {
            buttonColor = "white";
            opacity = 1.0;
        }

        $("#polygon-button").animate({
            backgroundColor: buttonColor,
            opacity: opacity
        }, 200);
    });

    $(function() {
        $("#overlay-slider").slider({
            value: 100,
            change: function(event, ui) {
                // call change only if too many layers, to avoid lag
                if (myMap.layers_.length > NUM_CHUNKS) {
                    // start at 1 to avoid base map layer
                    for (var i = 1; i < myMap.layers_.length; i++) {
                        var layerName = myMap.layers_[i].id;

                        myMap.map.setPaintProperty(layerName, "circle-opacity", ui.value / 100.0);
                    }
                }
            },
            slide: function(event, ui) {
                // call slide only if sufficiently small amount of layers, otherwise lag
                if (myMap.layers_.length <= NUM_CHUNKS) {
                    // start at 1 to avoid base map layer
                    for (var i = 1; i < myMap.layers_.length; i++) {
                        var layerName = myMap.layers_[i].id;

                        myMap.map.setPaintProperty(layerName, "circle-opacity", ui.value / 100.0);
                    }
                }
            }
        });
    });

    // enter key triggers go button for search
    $("#search-input").keyup(function(event) {
        var ENTER_KEY = 13;

        if (event.keyCode == ENTER_KEY) {
            search();
        }
    });

    var clickedArea = null;
    // logic for search button
    $("#search-button").on("click", function() {
        search();
    });

    $("#close-button").on("click", function() {
        $('.wrap#select-area-wrap').toggleClass('active');
    });

    // cancel the popup
    $('#cancelPopupButton').on('click', function() {
        console.log("#cancel");
        $('.wrap#select-area-wrap').toggleClass('active');
    });
});
