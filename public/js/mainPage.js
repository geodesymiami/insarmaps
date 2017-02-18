var overlayToggleButton = null;
var dotToggleButton = null;
var secondGraphToggleButton = null;
var regressionToggleButton = null;
var detrendToggleButton = null;
var topGraphToggleButton = null;
var bottomGraphToggleButton = null;
var contourToggleButton = null;
var gpsStationsToggleButton = null;
var myMap = null;

function getRootUrl() {
    return window.location.origin ? window.location.origin + '/' : window.location.protocol + '/' + window.location.host + '/';
}

function DivState() {
    this.height = 0;
    this.width = 0;
    this.animating = false;
}

function AreaAttributesPopup() {
    var that = this;

    this.oldDivState = new DivState();

    this.resetTabContents = function() {
        $("#downloads-tab").html("<p>Download to Unavco InSAR data products to be implemented.</p>");
        $("#reference-tab").html("<p>Reference to the papers to be added.</p>");
        $("#figures-tab").html("<p>Figures to be added</p>")
    };

    this.populate = function(area) {
        var tableHTML = "";
        var attributekeys = null;
        var attributevalues = null;

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

        // set like object. don't put these in using the for loop, as we will
        // manually set their order
        var manuallyOrdered = {
            "history": true,
            "processing_type": true
        };

        var attributesController = new AreaAttributesController(myMap, area);
        var areaAttributes = attributesController.getAllAttributes();

        for (var curKey in areaAttributes) {
            if (areaAttributes.hasOwnProperty(curKey)) {
                if (!(curKey in manuallyOrdered)) {
                    if (curKey in attributesToDisplay) {
                        var curValue = areaAttributes[curKey];

                        tableHTML += "<tr><td value=" + curKey + ">" + curKey +
                            "</td>";
                        tableHTML += "<td value=" + curValue + ">" + curValue +
                            "</td></tr>";
                    }
                }
            }
        }

        // go over manually ordered attributes
        for (var curKey in manuallyOrdered) {
            if (manuallyOrdered.hasOwnProperty(curKey)) {
                var curValue = areaAttributes[curKey];

                tableHTML += "<tr><td value=" + curKey + ">" + curKey + "</td>";
                tableHTML += "<td value=" + curValue + ">" + curValue +
                    "</td></tr>";
            }
        }

        var prettyNameAndComponents = myMap.prettyPrintProjectName(area.properties
            .project_name);
        $("#area-attributes-areaname-div").html(area.properties.region +
            " " + prettyNameAndComponents.missionSatellite + " " +
            prettyNameAndComponents.missionType);

        $("#area-attributes-table-body").html(tableHTML);

        // needed so area attributes popup doesn't show content that's supposed to be hidden
        // in other tabs
        var clickEvent = jQuery.Event("click");
        var link = $("#details-tab-link");
        clickEvent.currentTarget = link;
        link.trigger(clickEvent);

        this.resetTabContents();
        this.populateTabs(area);
    }

    this.show = function(area) {
        if (!$('.wrap#area-attributes-div').hasClass('active')) {
            $('.wrap#area-attributes-div').toggleClass('active');
        } else if (this.isMinimized()) {
            $("#area-attributes-div-minimize-button").click();
        }

        this.populate(area);
    };

    this.isMinimized = function() {
        return $('#area-attributes-div-minimize-button').hasClass('maximize-button');
    };

    this.maximize = function(animated) {
        var areaAttributesWrap = $('.wrap#area-attributes-div');
        var button = $("#area-attributes-div-minimize-button");
        var that = this;
        if (animated) {
            this.oldDivState.animating = true;
            areaAttributesWrap.animate({
                "height": that.oldDivState.height,
                "width": that.oldDivState.width
            }, {
                done: function() {
                    areaAttributesWrap.tooltip(
                        "disable");
                    button.removeClass("maximize-button")
                        .addClass("minimize-button");
                    that.oldDivState.animating =
                        false;
                }
            });
        } else {
            areaAttributesWrap.width(this.oldDivState.width);
            areaAttributesWrap.height(this.oldDivState.height);
        }
    };

    this.minimize = function(animated) {
        var that = this;
        var areaAttributesWrap = $('.wrap#area-attributes-div');
        var button = $("#area-attributes-div-minimize-button");
        this.oldDivState.width = areaAttributesWrap.width();
        this.oldDivState.height = areaAttributesWrap.height();

        var topRightButtonsWidth = areaAttributesWrap.find(
            ".top-right-buttons").width() + 10;
        areaAttributesWrap.css("overflow-y", "hidden");

        $(".wrap#area-attributes-div").animate({
            "height": "5%",
            "width": topRightButtonsWidth
        }, {
            done: function() {
                areaAttributesWrap.tooltip(
                    "enable");
                button.removeClass("minimize-button")
                    .addClass("maximize-button");
                that.oldDivState.animating =
                    false;
            }
        });
    };

    this.populateTabs = function(area) {
        var attributesController = new AreaAttributesController(myMap, area);

        if (attributesController.areaHasAttribute("plotAttributePreset_Name")) {
            var html = "<a href='#' id='preset-dataset-link'>" +
                attributesController.getAttribute("plotAttributePreset_Name") + "</a>";
            $("#figures-tab").html(html);
            $("#preset-dataset-link").on("click", function() {
                attributesController.processAttributes();
            });
        }

        if (attributesController.areaHasAttribute("referencePdfUrl") &&
            attributesController.areaHasAttribute("referenceText")) {
            var html = "<a href='" + attributesController.getAttribute("referencePdfUrl") + "' target='_blank'>" + attributesController.getAttribute("referenceText") + "</a>";
            $("#reference-tab").html(html);
        }
    };
};

function getGEOJSON(area) {
    // currentPoint = 1;

    // var query = {
    //   "area": area,
    //   "fileChunk": currentPoint
    // }

    // loadJSON(query, "file", myMap.JSONCallback);
    //var tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://localhost:8888/t/{z}/{x}/{y}.pbf"], "vector_layers":[]};
    //myMap.tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://localhost:8888/" + area + "/{z}/{x}/{y}.pbf"], "vector_layers":[]};
    // myMap.tileJSON = { "minzoom": 0, "maxzoom": 14, "center": [130.308838, 32.091882, 14], "bounds": [130.267778, 31.752321, 131.191112, 32.634544], "tiles": ["http://ec2-52-41-231-16.us-west-2.compute.amazonaws.com:8888/" + area.name + "/{z}/{x}/{y}.pbf"], "vector_layers": [] };

    var tileJSON = {
        "minzoom": 0,
        "maxzoom": 14,
        "center": [130.308838,
            32.091882, 14
        ],
        "bounds": [130.267778, 31.752321, 131.191112, 32.634544],
        "tiles": [
            "http://129.171.60.12:8888/" + area.properties.unavco_name +
            "/{z}/{x}/{y}.pbf"
        ],
        "vector_layers": []
    };

    if (myMap.pointsLoaded()) {
        myMap.removePoints();
        myMap.removeTouchLocationMarkers();
    }

    currentArea = area;

    // make streets toggle button be only checked one
    $("#streets").prop("checked", true);
    for (var i = 1; i <= area.properties.num_chunks; i++) {
        var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
        tileJSON.vector_layers.push(layer);
    }

    areaAttributesPopup.show(area);

    if (!$("#color-scale").hasClass("active")) {
        $("#color-scale").toggleClass("active");
    }

    // when we click, we don't reset the highlight of modified markers one final time
    myMap.areaMarkerLayer.resetHighlightsOfAllMarkers();
    // get a recolor selector
    var button = $("#polygon-button");
    button.attr("data-original-title", "Select Points");
    myMap.selector.disableSelectMode(); // in case it is selected
    myMap.selector.removeEventListeners(); // remove old event listeners
    myMap.selector = new RecolorSelector();
    myMap.selector.map = myMap;
    myMap.selector.associatedButton = button;
    myMap.selector.prepareEventListeners(); // and add new ones

    myMap.colorScale.defaultValues(); // set default values in case they were modified by another area
    myMap.selector.reset(currentArea);
    $("#color-on-dropdown").val("velocity");
    $("#color-scale-text-div").html("LOS Velocity [cm/yr]");

    myMap.addDataset(tileJSON);
    var styleLoadFunc = function(event) {
        myMap.map.off("data", styleLoadFunc);
        myMap.removeAreaMarkers();

        overlayToggleButton.set("on");

        // in case it's up
        myMap.gpsStationPopup.remove();
        window.setTimeout(function() {
            var zoom = 8.0;

            // quickly switching between areas? don't reset zoom
            if (myMap.anAreaWasPreviouslyLoaded()) {
                zoom = myMap.map.getZoom();
            }
            // set our tilejson to the one we've loaded. this will make sure anAreaWasPreviouslyLoaded method returns true after the
            // first time a dataset is selected
            myMap.tileJSON = tileJSON;

            var centerOfDataset = area.properties.centerOfDataset;

            if (typeof centerOfDataset === "string") {
                centerOfDataset = JSON.parse(centerOfDataset);
            }

            // converter accidentally switched lat and long...
            // TODO: fix that and rerun datasets when pysar2unavco is fully finished
            var lat = centerOfDataset.longitude;
            var long = centerOfDataset.latitude;

            myMap.map.flyTo({
                center: [long, lat],
                zoom: zoom
            });

            myMap.loadAreaMarkersExcluding([area.properties.unavco_name], null);
            // in case someone called loading screen
            hideLoadingScreen();
        }, 1000);
    };

    myMap.map.on("data", styleLoadFunc);
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

function showLoadingScreen(msg) {
    if (!$("#loading-screen.overlay-div").hasClass("active")) {
        $("#loading-screen.overlay-div").toggleClass("active");
        $("#loading-text-div").html(msg);
    }
}

function hideLoadingScreen() {
    if ($("#loading-screen.overlay-div").hasClass("active")) {
        $("#loading-screen.overlay-div").toggleClass("active");
    }
}

// enum-style object to denote toggle state
var ToggleStates = {
    OFF: 0,
    ON: 1
};

function ToggleButton(id) {
    var that = this;
    this.id = id;
    this.toggleState = $(this.id).prop('checked') ? ToggleStates.ON :
        ToggleStates.OFF;
    this.onclick = null;
    this.firstToggle = true;

    this.toggle = function() {
        if (this.toggleState == ToggleStates.ON) {
            this.toggleState = ToggleStates.OFF;
            $(this.id).prop('checked', false);
        } else {
            this.toggleState = ToggleStates.ON;
            $(this.id).prop('checked', true);
        }
    };

    this.set = function(state) {
        if (state == "on") {
            if (this.toggleState == ToggleStates.OFF) {
                this.toggle();
            }
        } else if (state == "off") {
            if (this.toggleState == ToggleStates.ON) {
                this.toggle();
            }
        } else {
            throw "invalid toggle option";
        }
    }
    this.onclick = function(clickFunction) {
        $(this.id).on("click", function() {
            // toggle states
            this.toggle();

            clickFunction();
        }.bind(this));
    };
}

function switchLayer(layer) {
    var layerID = layer.target.id;
    var styleLoadFunc = null;

    // we assume in this case that an area has been clicked
    if (overlayToggleButton.toggleState == ToggleStates.ON && myMap.anAreaWasPreviouslyLoaded()) {
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
            var markerCoords = myMap.clickLocationMarker.data.features[0].geometry
                .coordinates;
            latTop = markerCoords[0];
            longTop = markerCoords[1];
            mapHadClickLocationMarkerTop = true;

            if (myMap.map.getLayer(layerIDBot)) {
                var markerCoords = myMap.clickLocationMarker2.data.features[0].geometry
                    .coordinates;
                latBot = markerCoords[0];
                longBot = markerCoords[1];
                mapHadClickLocationMarkerBot = true;
            }
        }

        myMap.setBaseMapLayer(layerID);

        // finally, add back the click location marker, do on load of style to prevent
        // style not done loading error
        styleLoadFunc = function() {
            myMap.map.off("data", styleLoadFunc);
            myMap.addDataset(myMap.tileJSON);
            myMap.loadAreaMarkersExcluding([currentArea.properties.unavco_name], null)
            if (gpsStationsToggleButton.toggleState == ToggleStates.ON) {
                myMap.addGPSStationMarkers(gpsStations);
            }

            if (mapHadClickLocationMarkerTop) {
                myMap.removeTouchLocationMarkers();

                myMap.clickLocationMarker.data = {
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
                };
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
                myMap.clickLocationMarker2.data = {
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
                };
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
        };
        myMap.map.on("data", styleLoadFunc);
    } else {
        myMap.setBaseMapLayer(layerID);

        if (myMap.areaFeatures != null) {
            styleLoadFunc = function(event) {
                myMap.map.off("data", styleLoadFunc);
                if (contourToggleButton.toggleState == ToggleStates.ON) {
                    myMap.addContourLines();
                }
                if (gpsStationsToggleButton.toggleState == ToggleStates.ON) {
                    myMap.addGPSStationMarkers(gpsStations);
                }

                myMap.loadAreaMarkers(null);
            };

            myMap.map.on("data", styleLoadFunc);
        }
    }

    myMap.map.off("data");
}

function setupToggleButtons() {
    /*TOGGLE BUTTON*/
    overlayToggleButton = new ToggleButton("#overlay-toggle-button");
    overlayToggleButton.onclick(function() {
        // on? add layers, otherwise remove them
        if (overlayToggleButton.toggleState == ToggleStates.ON) {
            if (!myMap.anAreaWasPreviouslyLoaded()) {
                overlayToggleButton.set("off");
                return;
            }

            $("#overlay-slider").slider("value", 100);
            myMap.addDataset(myMap.tileJSON);
        } else {
            if (myMap.pointsLoaded()) {
                $("#overlay-slider").slider("value", 0);
                myMap.removePoints();
                myMap.removeTouchLocationMarkers();
            }
        }
    });
    // line connecting dots in chart on/off
    dotToggleButton = new ToggleButton("#dot-toggle-button");
    dotToggleButton.onclick(function() {
        if (dotToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.connectDots();
        } else {
            myMap.graphsController.disconnectDots();
        }
    });

    secondGraphToggleButton = new ToggleButton(
        "#second-graph-toggle-button");
    secondGraphToggleButton.onclick(function() {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.prepareForSecondGraph();
        } else {
            myMap.graphsController.removeSecondGraph();
        }
    });

    regressionToggleButton = new ToggleButton("#regression-toggle-button");
    regressionToggleButton.onclick(function() {
        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.addRegressionLines();
        } else {
            myMap.graphsController.removeRegressionLines();
        }
    });

    detrendToggleButton = new ToggleButton("#detrend-toggle-button");
    detrendToggleButton.onclick(function() {
        if (detrendToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.detrendData();
        } else {
            myMap.graphsController.removeDetrend();
        }
    });

    topGraphToggleButton = new ToggleButton("#top-graph-toggle-button");
    topGraphToggleButton.onclick(function() {
        if (topGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.selectedGraph = "Top Graph";
            bottomGraphToggleButton.set("off");
        } else {
            myMap.graphsController.selectedGraph = "Bottom Graph";
        }
    });
    bottomGraphToggleButton = new ToggleButton(
        "#bottom-graph-toggle-button");
    bottomGraphToggleButton.onclick(function() {
        if (bottomGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.selectedGraph = "Bottom Graph";
            topGraphToggleButton.set("off");
        } else {
            myMap.graphsController.selectedGraph = "Top Graph";
        }
    });

    contourToggleButton = new ToggleButton("#contour-toggle-button");
    contourToggleButton.onclick(function() {
        if (contourToggleButton.toggleState == ToggleStates.ON) {
            myMap.addContourLines();
        } else {
            myMap.removeContourLines();
        }
    });

    gpsStationsToggleButton = new ToggleButton("#gps-stations-toggle-button");
    gpsStationsToggleButton.onclick(function() {
        if (gpsStationsToggleButton.toggleState == ToggleStates.ON) {
            // gpsStations global variable from gpsStations.js
            myMap.addGPSStationMarkers(gpsStations);
        } else {
            myMap.removeGPSStationMarkers();
        }
    });
}

function search() {
    var areas = myMap.areaFeatures;

    if (!$('.wrap#select-area-wrap').hasClass('active')) {
        $('.wrap#select-area-wrap').toggleClass('active');
    }
    if (areas != null) {
        // TODO: dummy search for paper, add actual paper later on when we get attribute    
        query = $("#search-input").val();

        // TODO: remove, this is placeholder
        for (var i = 0; i < areas.length; i++) {
            areas[i].properties.reference =
                "Chaussard, E., Amelung, F., & Aoki, Y. (2013). Characterization of open and closed volcanic systems in Indonesia and Mexico using InSAR time‐series. Journal of Geophysical Research: Solid Earth, DOI: 10.1002/jgrb.50288";
            // add mission so it's fuse searchable
            areas[i].properties.mission = areas[i].properties.attributevalues[0];
        }
        // new sublist of areas that match query
        var match_areas = [];

        var fuse = new Fuse(areas, {
            keys: ["properties.country",
                "properties.unavco_name", "properties.region",
                "properties.mission"
            ]
        });
        var countries = fuse.search(query);
        var attributesController = new AreaAttributesController(myMap, countries[0]);

        // add our info in a table, first remove any old info
        $(".wrap#select-area-wrap").find(".content").find("#myTable").find(
            "#tableBody").empty();
        for (var i = 0; i < countries.length; i++) {
            var country = countries[i];
            attributesController.setArea(country);
            var properties = country.properties;

            // so we don't have to check whether it's a string or proper object every time
            // TODO: best solution is to have a function - get js object from mapbox clicked marker
            // this way we don't have to stringify these js objects, and mapbox clicked feature would
            // also be objects
            properties.decimal_dates = JSON.stringify(properties.decimal_dates);
            properties.extra_attributes = JSON.stringify(properties.extra_attributes);
            properties.attributekeys = JSON.stringify(properties.attributekeys);
            properties.attributevalues = JSON.stringify(properties.attributevalues);
            properties.centerOfDataset = JSON.stringify(properties.centerOfDataset);

            var referenceHTML = "Reference to the papers to be added.";
            if (attributesController.areaHasAttribute("referencePdfUrl") &&
                attributesController.areaHasAttribute("referenceText")) {
                referenceHTML = "<a href='" + attributesController.getAttribute("referencePdfUrl") +
                    "' target='_blank'>" + attributesController.getAttribute("referenceText") + "</a>";
            }

            $("#tableBody").append("<tr id=" + properties.unavco_name +
                "><td value='" + properties.unavco_name + "''>" +
                properties.unavco_name + " (" + properties.project_name +
                ")</td><td value='reference'>" + referenceHTML + "</td></tr>"
            );

            // make cursor change when mouse hovers over row
            $("#" + properties.unavco_name).css("cursor", "pointer");
            // set the on click callback function for this row

            // ugly click function declaration to JS not using block scope
            $("#" + properties.unavco_name).click((function(country) {
                return function(e) {
                    // don't load area if reference link is clicked
                    if (e.target.cellIndex == 0) {
                        clickedArea = country;
                        $('.wrap#select-area-wrap').toggleClass(
                            'active');
                        getGEOJSON(country);
                    }
                };
            })(country));
        }
    } else {
        $("#tableBody").html("No areas found");
    }
}

function prepareButtonsToHighlightOnHover() {
    $(".clickable-button").hover(function() {
        $(this).addClass("hovered");
    }, function() {
        $(this).removeClass("hovered");
    });
}

function slideFunction(event, ui) {
    // start at 1 to avoid base map layer
    for (var i = 1; i < myMap.layers_.length; i++) {
        var layerName = myMap.layers_[i].id;
        var newOpacity = ui.value / 100.0;
        newOpacity *= newOpacity * newOpacity; // scale it, as the default scale is not very linear

        myMap.map.setPaintProperty(layerName, "circle-opacity", newOpacity);
    }
}

// when site loads, turn toggle on
$(window).load(function() {
    $(window).on('hashchange', function(e) {
        history.replaceState("", document.title, e.originalEvent.oldURL);
    });

    var NUM_CHUNKS = 300;

    // inheritance of LineSelector class
    RecolorSelector.prototype = new SquareSelector();
    AreaFilterSelector.prototype = new SquareSelector();
    LineSelector.prototype = new SquareSelector();
    setupRecolorSelector();
    setUpAreaFilterSelector();
    myMap = new Map(loadJSON);
    myMap.addMapToPage("map-container");

    var layerList = document.getElementById('map-type-menu');
    var inputs = layerList.getElementsByTagName('input');

    for (var i = 0; i < inputs.length; i++) {
        inputs[i].onclick = switchLayer;
    }

    setupToggleButtons();

    $("#color-on-dropdown").change(function() {
        var selectedColoring = $(this).val();
        if (selectedColoring === "displacement") {
            if (!currentArea) {
                return;
            }

            myMap.colorOnDisplacement = true;
            var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.decimal_dates));
            var startDate = dates[0];
            var endDate = dates[dates.length - 1];
            if (myMap.selector.minIndex != -1 && myMap.selector.maxIndex != -1) {
                startDate = dates[myMap.selector.minIndex];
                endDate = dates[myMap.selector.maxIndex];
            }

            var possibleDates = myMap.graphsController.mapDatesToArrayIndeces(startDate, endDate, dates);
            myMap.selector.minIndex = possibleDates.minIndex;
            myMap.selector.maxIndex = possibleDates.maxIndex;
            myMap.selector.recolorOnDisplacement(startDate, endDate, "Recoloring in progress... for fast zoom in and out, switch to velocity or disable or deselect on the fly coloring");
            $("#color-scale-text-div").html("LOS Displacement (cm)");
        } else if (selectedColoring === "velocity") {
            myMap.colorOnDisplacement = false;
            if (myMap.map.getSource("onTheFlyJSON")) {
                myMap.map.removeSource("onTheFlyJSON");
                myMap.map.removeLayer("onTheFlyJSON");
            }
            $("#color-scale-text-div").html("LOS Velocity [cm/yr]");
        } else {
            throw "Invalid dropdown selection";
        }
    });

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

    // set up tooltips on graph div and area attributes div
    $(".wrap#charts").tooltip("disable");
    $(".wrap#area-attributes-div").tooltip("disable");

    // below code might be able to be reduced by using AreaAttributesPopup
    // class functionality. We can use a super class of the two and define
    // subclasses
    var oldGraphDiv = new DivState();

    $("#graph-div-minimize-button").on("click", function(event) {
        if (oldGraphDiv.animating) {
            return;
        }

        var chartWrap = $(".wrap#charts");
        var button = $("#graph-div-minimize-button");
        oldGraphDiv.animating = true;
        if (button.hasClass("maximize-button")) {
            chartWrap.animate({
                "height": oldGraphDiv.height,
                "width": oldGraphDiv.width
            }, {
                done: function() {
                    chartWrap.tooltip("disable");
                    button.removeClass("maximize-button").addClass("minimize-button");
                    oldGraphDiv.animating = false;
                }
            });

            $(".wrap#charts").resizable("enable");
            $(".wrap#charts").draggable("enable");
        } else {
            oldGraphDiv.height = chartWrap.height();
            oldGraphDiv.width = chartWrap.width();
            var topRightButtonsWidth = chartWrap.find(
                ".top-right-buttons").width() + 20;
            var oldBottom = chartWrap.css("bottom");
            chartWrap.css("bottom", oldBottom);
            chartWrap.css("top", "auto");

            $(".wrap#charts").resizable("disable");
            $(".wrap#charts").draggable("disable");
            chartWrap.animate({
                "height": "5%",
                "width": topRightButtonsWidth,
                "left": "0",
                "bottom": "5%"
            }, {
                done: function() {
                    chartWrap.tooltip("enable");
                    button.removeClass("minimize-button").addClass("maximize-button");
                    oldGraphDiv.animating = false;
                }
            });
        }
    });

    $("#area-attributes-div-minimize-button").on("click", function(
        event) {
        var areaAttributesWrap = $(".wrap#area-attributes-div");
        areaAttributesWrap.css("overflow-y", "auto");

        if (areaAttributesPopup.isMinimized()) {
            areaAttributesPopup.maximize(true);
        } else {
            areaAttributesPopup.minimize(true);
        }
    });
    // TODO: these minimize buttons are dying to be put into a class
    // to reduce redundant code
    $("#search-form-and-results-minimize-button").on("click", function() {
        // heights in percent
        var container = $("#search-form-and-results-container");
        if (!container.hasClass("toggled")) {
            $("#search-form-and-results-maximize-button").css("display", "block");
            container.css("display", "none");
            container.addClass("toggled");
        }

        myMap.map.resize();
    });

    $("#search-form-and-results-maximize-button").on("click", function() {
        var container = $("#search-form-and-results-container");
        if (container.hasClass("toggled")) {
            $(this).css("display", "none");
            container.css("display", "block");
            container.addClass("toggled");
            container.removeClass("toggled");
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
            myMap.graphsController.resizeChartContainers();

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
            myMap.graphsController.resizeChartContainers();
            myMap.graphsController.recreateGraphs();
        }
    });

    $("#reset-button").on("click", function() {
        myMap.reset();

        myMap.map.flyTo({
            center: myMap.startingCoords,
            zoom: myMap.startingZoom
        });
    });

    $("#information-button").on("click", function() {
        $("#information-div.overlay-div").toggleClass("active");
    });

    $("#close-information-button").on("click", function() {
        $("#information-div.overlay-div").toggleClass("active");
    });

    $(function() {
        $('[data-toggle="tooltip"]').tooltip().click(function() {
            $('.tooltip').fadeOut('fast', function() {
                $('.tooltip').remove();
            });
        });
    });

    $("#polygon-button").on("click", function() {
        myMap.selector.toggleMode();
    });

    // TODO: need to consolidate this if has class pattern into Toggable Class
    // We can also have a class for square selector type square buttons if he wants more
    $("#dataset-frames-toggle-button").on("click", function() {
        if ($(this).hasClass("toggled")) {
            myMap.loadAreaMarkers(null);
            $(this).attr("data-original-title", "Hide Swaths");
            $(this).removeClass("toggled");
        } else {
            myMap.removeAreaMarkers();
            $(this).attr("data-original-title", "Show Swaths");
            $(this).addClass("toggled");
        }
    });

    $(function() {
        $("#overlay-slider").slider({
            value: 100,
            change: function(event, ui) {
                // call change only if too many layers, to avoid lag
                if (myMap.layers_.length >
                    NUM_CHUNKS) {
                    slideFunction(event, ui);
                }
            },
            slide: function(event, ui) {
                // call slide only if sufficiently small amount of layers, otherwise lag
                if (myMap.layers_.length <=
                    NUM_CHUNKS) {
                    slideFunction(event, ui);
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

    $(".close-button").on("click", function() {
        $(this).parent().parent().toggleClass("active");
    });

    $("#login-logout-button").on('click', function() {
        if ($("#login-logout-button").hasClass("logged-in")) {
            window.location = "/auth/logout";
        } else {
            window.location = "/auth/login";
        }
    });

    $("#webservices-ui-button").on("click", function() {
        window.location = "/WebServicesUI";
    });

    prepareButtonsToHighlightOnHover();

    $("#download-as-text-button").click(function() {
        window.open("/textFile/" + currentArea.properties.unavco_name +
            "/" + currentPoint);
    });

    myMap.colorScale.initVisualScale();

    $("#scale-values .form-group > input").keypress(function(e) {
        var ENTER = 13;

        if (e.which == ENTER) {
            var min = $("#min-scale-value").val();
            var max = $("#max-scale-value").val();

            myMap.colorScale.min = min;
            myMap.colorScale.max = min;

            myMap.refreshDataset();
        }
    });

    $("#search-form-results-table").tablesorter();
});
