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
        myMap.removeTouchLocationMarker();
    }

    // make streets toggle button be only checked one
    $("#streets").prop("checked", true);

    for (var i = 1; i <= area.coords.num_chunks; i++) {
        var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
        myMap.tileJSON.vector_layers.push(layer);
    }

    $('.wrap#area-attributes-div').toggleClass('active');

    myMap.initLayer(myMap.tileJSON, "streets");
    myMap.map.style.on("load", function() {
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
    this.toggleState = ToggleStates.off;
    this.id = id;
    this.onclick = null;
    this.firstToggle = true;

    this.toggle = function() {
        $(that.id).toggleClass('toggle-button-selected');

        if (that.toggleState == ToggleStates.ON) {
            that.toggleState = ToggleStates.OFF;
        } else {
            that.toggleState = ToggleStates.ON;
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
            myMap.removeTouchLocationMarker();
        }
    }
});

function switchLayer(layer) {
    var layerId = layer.target.id;

    var tileset = 'mapbox.' + layerId;

    if (overlayToggleButton.toggleState == ToggleStates.ON && myMap.tileJSON != null) {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        // if (myMap.map.getLayer(layerID)) {

        // }
        var layerID = "touchLocation";
        var lat = 0.0;
        var long = 0.0;
        var mapHadClickLocationMarker = false;

        if (myMap.map.getLayer(layerID)) {
            var markerCoords = myMap.clickLocationMarker._data.features[0].geometry.coordinates;
            lat = markerCoords[0];
            long = markerCoords[1];
            mapHadClickLocationMarker = true;

            myMap.removeTouchLocationMarker();
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
            if (mapHadClickLocationMarker) {
                myMap.clickLocationMarker.setData({
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lat, long]
                        },
                        "properties": {
                            "marker-symbol": "cross"
                        }
                    }]
                });
                myMap.map.addSource(layerID, myMap.clickLocationMarker);

                myMap.map.addLayer({
                    "id": layerID,
                    "type": "symbol",
                    "source": layerID,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                    }
                });
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
    }
}

for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
}

// line connecting dots in chart on/off
var dotToggleButton = new ToggleButton("#dot-toggle-button");
dotToggleButton.onclick(function() {
    var chart = $("#chartContainer").highcharts();

    if (dotToggleButton.toggleState == ToggleStates.ON) {
        chart.series[0].update({
            type: "line"
        });
    } else {
        chart.series[0].update({
            type: "scatter"
        });
    }
    // prevents bug resulting from toggling line connecting points on the graph
    // without this, this function gets called the first time, but for some reason,
    // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
    // i suspect that high charts is doing something with the series array when you use update, resulting in that
    // issue, since the loop works afterwards (when user actually uses the navigator) as normal
    if (firstToggle) {
        var seriesLength = chart.series.length;

        for (var i = seriesLength - 1; i > -1; i--) {
            if (chart.series[i].name == "Linear Regression") {
                chart.series[i].remove();
                break;
            }
        }

        firstToggle = false;
    }
});

var secondGraphToggleButton = new ToggleButton("#second-graph-toggle-button");
secondGraphToggleButton.onclick(function() {
    if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
        //$("#charts").append('<div id="chartContainer2" class="side-item graph"></div>');
        $("#chartContainer2").css("display", "block");
        $("#chartContainer").height("50%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        $("#chartContainer").height(newHeight);
        $("#chartContainer").highcharts().setSize(newWidth, newHeight, doAnimation = true);
    } else {
        var layerID = "touchLocation2";
        if (myMap.map.getLayer(layerID)) {
            myMap.map.removeLayer(layerID);
            myMap.map.removeSource(layerID);
            myMap.touchLocationMarker2 = new mapboxgl.GeoJSONSource();
        }

        //$("#chartContainer2").remove();
        $("#chartContainer2").css("display", "none");
        $("#chartContainer").height("100%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        $("#chartContainer").highcharts().setSize(newWidth, newHeight, doAnimation = true);
    }
});

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
            $("#chartContainer").highcharts(myMap.highChartsOpts["chartContainer"]);
            if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
                $("#chartContainer2").highcharts(myMap.highChartsOpts["chartContainer2"]);
            }
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
            $("#chartContainer").highcharts(myMap.highChartsOpts["chartContainer"]);
            if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
                $("#chartContainer2").highcharts(myMap.highChartsOpts["chartContainer2"]);
            }
        }
    });

    $("#reset-button").on("click", function() {
        if (myMap.pointsLoaded()) {
            myMap.removePoints();
            myMap.removeTouchLocationMarker();
            myMap.elevationPopup.remove(); // incase it's up

            myMap.loadAreaMarkers();

            // remove click listener for selecting an area, and add new one for clicking on a point
            myMap.map.off("click");
            myMap.map.on('click', myMap.clickOnAnAreaMaker);
        }

        myMap.map.flyTo({
            center: [0, 0],
            zoom: 0
        });
    });
    $(function() {
        $('[data-toggle="tooltip"]').tooltip()
    });

    $("#polygon-button").on("click", function() {
        myMap.selector.polygonButtonSelected = !myMap.selector.polygonButtonSelected;

        // reset bounding box
        if (!myMap.selector.polygonButtonSelected) {
            myMap.bbox = null;
        }
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
    $("#overlay-toggle-button").toggleClass('toggle-button-selected');
    overlayToggleButton.toggleState = ToggleStates.ON;

    // enter key triggers go button for search
    $("#search-input").keyup(function(event) {
        var ENTER_KEY = 13;

        if (event.keyCode == ENTER_KEY) {
            $("#search-button").click();
        }
    });
    var json = null;
    var clickedArea = null;
    // logic for search button
    $("#search-button").on("click", function() {
        console.log(json);
        if (json != null) {
            // TODO: dummy search for paper, add actual paper later on when we get attribute    
            query = $("#search-input").val();
            // full list of areas
            var areas = json.areas;
            // TODO: remove, this is placeholder
            for (var i = 0; i < areas.length; i++) {
                areas[i].reference = "Chaussard, E., Amelung, F., & Aoki, Y. (2013). Characterization of open and closed volcanic systems in Indonesia and Mexico using InSAR time‐series. Journal of Geophysical Research: Solid Earth, DOI: 10.1002/jgrb.50288";
            }
            // new sublist of areas that match query
            var match_areas = [];

            var fuse = new Fuse(areas, { keys: ["coords.country", "name", "reference"] });
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
        }

    });

    $("#close-button").on("click", function() {
        $('.wrap#select-area-wrap').toggleClass('active');
    });

    $('#popupButton').on('click', function() {
        $('.wrap#select-area-wrap').toggleClass('active');

        // get json response and put it in a table
        loadJSON("", "areas", function(response) {
            json = JSON.parse(response);

            // add our info in a table, first remove any old info
            $(".wrap#select-area-wrap").find(".content").find("#myTable").find("#tableBody").empty();
            for (var i = 0; i < json.areas.length; i++) {
                var area = json.areas[i];

                $("#tableBody").append("<tr id=" + area.name + "><td value='" + area.name + "''>" + area.name +
                    "</td><td value='reference'><a href='http://www.rsmas.miami.edu/personal/famelung/Publications_files/ChaussardAmelungAoki_VolcanoCycles_JGR_2013.pdf' target='_blank'>" +
                    "Chaussard, E., Amelung, F., & Aoki, Y. (2013). Characterization of open and closed volcanic systems in Indonesia and Mexico using InSAR time‐series. Journal of Geophysical Research: Solid Earth, DOI: 10.1002/jgrb.50288.</a></td></tr>");

                // make cursor change when mouse hovers over row
                $("#" + area.name).css("cursor", "pointer");
                // set the on click callback function for this row

                // ugly click function declaration to JS not using block scope
                $("#" + area.name).click((function(area) {
                    return function(e) {
                        // don't load area if reference link is clicked
                        if (e.target.cellIndex == 0) {
                            clickedArea = area.name;
                            $('.wrap#select-area-wrap').toggleClass('active');
                            getGEOJSON(area);
                        }
                    };
                })(area));
            }
        });

        return false;
    });

    // cancel the popup
    $('#cancelPopupButton').on('click', function() {
        console.log("#cancel");
        $('.wrap#select-area-wrap').toggleClass('active');
    });
});
