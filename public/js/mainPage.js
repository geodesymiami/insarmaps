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

function switchLayer(layer) {
    var layerId = layer.target.id;

    var tileset = 'mapbox.' + layerId;

    if (toggleState == ToggleStates.ON && myMap.tileJSON != null) {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        if (myMap.map.getLayer(layerID)) {
            var layerID = "touchLocation";
            myMap.map.removeLayer(layerID);
            myMap.map.removeSource(layerID);

            myMap.clickLocationMarker = new mapboxgl.GeoJSONSource();
        }

        myMap.map.setStyle({
            version: 8,
            sprite: "mapbox://sprites/mapbox/streets-v8",
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
    } else {
        myMap.map.setStyle({
            version: 8,
            sprite: "mapbox://sprites/mapbox/streets-v8",
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
    myMap.tileJSON = { "minzoom": 0, "maxzoom": 14, "center": [130.308838, 32.091882, 14], "bounds": [130.267778, 31.752321, 131.191112, 32.634544], "tiles": ["http://insarvmcsc431.cloudapp.net:8888/" + area + "/{z}/{x}/{y}.pbf"], "vector_layers": [] };

    console.log(myMap.tileJSON);
    for (var i = 1; i < 944; i++) {
        var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
        myMap.tileJSON.vector_layers.push(layer);
    }

    myMap.initLayer(myMap.tileJSON);
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
/*TOGGLE BUTTON*/
var overlayToggleButton = new ToggleButton("#overlay-toggle-button");
overlayToggleButton.onclick(function() {
    // on? add layers, otherwise remove them
    if (overlayToggleButton.toggleState == ToggleStates.ON) {
        myMap.map.addSource("vector_layer_", {
            type: 'vector',
            tiles: myMap.tileJSON['tiles'],
            minzoom: myMap.tileJSON['minzoom'],
            maxzoom: myMap.tileJSON['maxzoom'],
            bounds: myMap.tileJSON['bounds']
        });
        for (var i = 0; i < myMap.layers_.length; i++) {
            var layer = myMap.layers_[i];

            myMap.map.addLayer(layer);
        }
    } else {
        myMap.map.removeSource("vector_layer_");

        for (var i = 0; i < myMap.layers_.length; i++) {
            var id = myMap.layers_[i].id;

            // don't remove the base map, only the points
            if (id !== "simple-tiles") {
                myMap.map.removeLayer(id);
            }
        }
    }
});

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

// when site loads, turn toggle on
$(window).load(function() {
    $("#overlay-toggle-button").toggleClass('toggle-button-selected');
    overlayToggleButton.toggleState = ToggleStates.ON;

    $("#close-button").on("click", function() {
        $('.wrap, #popupButton').toggleClass('active');
    });

    $('#popupButton').on('click', function() {
        $('.wrap, #popupButton').toggleClass('active');

        // get json response and put it in a table
        loadJSON("", "areas", function(response) {
            var json = JSON.parse(response);

            // add our info in a table, first remove any old info
            $(".wrap").find(".content").find("#myTable").find("#tableBody").empty();
            for (var i = 0; i < json.areas.length; i++) {
                var area = json.areas[i];

                $("#tableBody").append("<tr id=" + area.name + "><td value='" + area.name + "''>" + area.name + "</td></tr>");

                // make cursor change when mouse hovers over row
                $("#" + area.name).css("cursor", "pointer");
                // set the on click callback function for this row

                // ugly click function declaration to JS not using block scope
                $("#" + area.name).click((function(area) {
                    return function() {
                        $('.wrap, #popupButton').toggleClass('active');
                        getGEOJSON(area);
                    };
                })(area.name));
            }
        });

        return false;
    });

    // cancel the popup
    $('#cancelPopupButton').on('click', function() {
        console.log("#cancel");
        $('.wrap, #popupButton').toggleClass('active');
    });
});
