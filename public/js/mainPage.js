var overlayToggleButton = null;
var dotToggleButton = null;
var secondGraphToggleButton = null;
var regressionToggleButton = null;
var detrendToggleButton = null;
var topGraphToggleButton = null;
var bottomGraphToggleButton = null;
var contourToggleButton = null;
var gpsStationsToggleButton = null;
var midasStationsToggleButton = null;
var recentDatasetsToggleButton = null;
var usgsEarthquakeToggleButton = null;
var IGEPNEarthquakeToggleButton = null;
var HawaiiRelocToggleButton = null;
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
            "frame": true, // for new datasets which use frame instead of first_frame
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

        var first_frame = areaAttributes.first_frame ? areaAttributes.first_frame : areaAttributes.frame;
        var name = areaAttributes.mission + " " + areaAttributes.relative_orbit + " " + first_frame + " " + areaAttributes.beam_mode + " " + areaAttributes.flight_direction;

        if (attributesController.areaHasPlotAttribute("plot.name")) {
            name = attributesController.getPlotAttribute("plot.name");
        }

        $("#area-attributes-areaname-div").html(name);

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
        if (this.isMinimized()) {
            this.maximize();
        }

        this.populate(area);
    };

    this.isMinimized = function() {
        return $('#area-attributes-div').hasClass('minimized');
    };

    this.isMaximized = function() {
        return !this.isMinimized();
    };

    this.maximize = function(animated) {
        var areaAttributesWrap = $('.wrap#area-attributes-div');
        areaAttributesWrap.css("overflow-y", "auto");

        areaAttributesWrap.addClass("active").removeClass("minimized").addClass("maximized");
        $("#area-attributes-div-minimize-button").css("display", "block");
        $("#area-attributes-div-maximize-button").css("display", "none");
    };

    this.minimize = function(animated) {
        var areaAttributesWrap = $('.wrap#area-attributes-div');
        areaAttributesWrap.css("overflow-y", "auto");

        areaAttributesWrap.removeClass("active").removeClass("maximized").addClass("minimized");
        $("#area-attributes-div-minimize-button").css("display", "none");
        $("#area-attributes-div-maximize-button").css("display", "block");
    };

    this.populateTabs = function(area) {
        var attributesController = new AreaAttributesController(myMap, area);

        if (attributesController.areaHasPlotAttribute("plot.title")) {
            var html = "<a href='#' id='preset-dataset-link'>" +
                attributesController.getPlotAttribute("plot.title") + "</a>";
            $("#figures-tab").html(html);
            $("#preset-dataset-link").on("click", function() {
                attributesController.processPresetFigureAttributes();
            });
        }

        if (attributesController.areaHasAttribute("referencePdfUrl") &&
            attributesController.areaHasAttribute("referenceText")) {
            var html = attributesController.getAttribute("referenceText") + " <a href='" + attributesController.getAttribute("referencePdfUrl") + "' target='_blank'>PDF</a>";
            $("#reference-tab").html(html);
        }
    };
};

function pysarSubsetToMapboxBounds(pysarSubset) {
    var latLongLimits = pysarSubset.split(",");
    var latLimits = latLongLimits[0].split(":");
    var longLimits = latLongLimits[1].split(":");
    var bottom = latLimits[0];
    var top = latLimits[1];
    var left = longLimits[0];
    var right = longLimits[1];

    var bounds = [left, bottom, right, top];

    return bounds;
}

function getGEOJSON(area) {
    var tileJSON = {
        "minzoom": 0,
        "maxzoom": 14,
        "center": [130.308838,
            32.091882, 14
        ],
        "bounds": null,
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

    myMap.colorScale.show();

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
    myMap.colorScale.setTitle("LOS Velocity [cm/yr]");

    myMap.thirdPartySourcesController.removemidasGpsStationMarkers();
    midasStationsToggleButton.set("off");

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

            var long = centerOfDataset[0];
            var lat = centerOfDataset[1];

            myMap.map.flyTo({
                center: [long, lat],
                zoom: zoom
            });

            var attributesController = new AreaAttributesController(myMap, area);
            attributesController.processAttributes();
            myMap.addSwathsFromJSON(myMap.areas, [area.properties.unavco_name]);
            myMap.areaMarkerLayer.setAreaRowHighlighted(area.properties.layerID);
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

function showLoadingScreen(msgTop, msgBottom) {
    if (!$("#loading-screen.overlay-div").hasClass("active")) {
        $("#loading-screen.overlay-div").toggleClass("active");
    }

    $("#loading-text-div-top").html(msgTop);
    $("#loading-text-div-bottom").html(msgBottom);
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

            if (clickFunction) {
                clickFunction();
            }
        }.bind(this));
    };

    this.click = function() {
        $(this.id).click();
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
                myMap.thirdPartySourcesController.addGPSStationMarkers(gpsStations);
            }

            midasStationsToggleButton.set("off");
            usgsEarthquakeToggleButton.set("off");
            IGEPNEarthquakeToggleButton.set("off");

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
                    myMap.thirdPartySourcesController.addGPSStationMarkers(gpsStations);
                }

                midasStationsToggleButton.set("off");
                usgsEarthquakeToggleButton.set("off");
                IGEPNEarthquakeToggleButton.set("off");

                myMap.loadAreaMarkers(null);
            };

            myMap.map.on("data", styleLoadFunc);
        }
    }

    myMap.map.off("data");
}

function setupToggleButtons() {
    /*TOGGLE BUTTON*/
    // TODO: the onclick callbacks are screaming to have the toggle state
    // passed into them...
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
            myMap.thirdPartySourcesController.addGPSStationMarkers(gpsStations);
        } else {
            myMap.thirdPartySourcesController.removeGPSStationMarkers();
        }
    });

    midasStationsToggleButton = new ToggleButton("#midas-stations-toggle-button");
    midasStationsToggleButton.onclick(function() {
        if (midasStationsToggleButton.toggleState == ToggleStates.ON) {
            if (myMap.pointsLoaded()) {
                midasStationsToggleButton.set("off");
            } else {
                myMap.thirdPartySourcesController.loadmidasGpsStationMarkers();
                myMap.colorScale.show();
            }
        } else {
            myMap.thirdPartySourcesController.removemidasGpsStationMarkers();
            if (!myMap.pointsLoaded()) {
                myMap.colorScale.remove();
            }
        }
    });

    usgsEarthquakeToggleButton = new ToggleButton("#usgs-earthquake-toggle-button");
    usgsEarthquakeToggleButton.onclick(function() {
        if (usgsEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadUSGSEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeUSGSEarthquakeFeed();
        }
    });

    IGEPNEarthquakeToggleButton = new ToggleButton("#IGEPN-earthquake-toggle-button");
    IGEPNEarthquakeToggleButton.onclick(function() {
        if (IGEPNEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadIGEPNEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeIGEPNEarthquakeFeed();
        }
    });

    HawaiiRelocToggleButton = new ToggleButton("#Hawaii-reloc-toggle-button");
    HawaiiRelocToggleButton.onclick(function() {
        if (HawaiiRelocToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadHawaiiReloc();
        } else {
            myMap.thirdPartySourcesController.removeHawaiiReloc();
        }
    });

    recentDatasetsToggleButton = new ToggleButton("#recent-datasets-toggle-button")
    recentDatasetsToggleButton.onclick(null);
}

function CountryGeocoder(mapboxAccessToken) {
    this.lastRequest = null;
    this.geocode = function(country, after) {
        this.lastRequest = $.ajax({
            url: "https://api.mapbox.com/geocoding/v5/mapbox.places/" + country + ".json?access_token=" + mapboxAccessToken + "&types=country",
            success: function(response) {
                var json = response;
                var features = json.features;

                if (after) {
                    after(features);
                }
                this.lastRequest = null;
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                this.lastRequest = null;
            }
        });
    }
}

function search() {
    var areas = myMap.allAreaFeatures;

    if (!$('.wrap#select-area-wrap').hasClass('active')) {
        $('.wrap#select-area-wrap').toggleClass('active');
    }
    if (areas != null) {
        // TODO: dummy search for paper, add actual paper later on when we get attribute    
        query = $("#search-input").val();
        var geocoder = new CountryGeocoder(mapboxgl.accessToken);
        geocoder.geocode(query, function(features) {
            if (features.length > 0) {
                var firstCountry = features[0];
                var swCorner = [firstCountry.bbox[0], firstCountry.bbox[1]];
                var neCorner = [firstCountry.bbox[2], firstCountry.bbox[3]];
                var bbox = [swCorner, neCorner];
                myMap.map.fitBounds(bbox);
            }
        });

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
        if (countries.length === 0) {
            return;
        }
        var attributesController = new AreaAttributesController(myMap, countries[0]);
        var searcher = new SearchFile("search-form");

        // empty old results
        $("#search-form-results-table tbody").empty();
        for (var i = 0; i < countries.length; i++) {
            attributesController.setArea(countries[i]);
            var fileAttributes = attributesController.getAllAttributes();
            searcher.generateMatchingAreaHTML(fileAttributes, countries[i]);
        }

        $("#search-form-results-table tr").hover(function() {
            searchTableHoverIn(this);
        }, function() {
            searchTableHoverOut(this);
        });

        $("#search-form-results-table").trigger("update");
    }
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
    populateSearchAutocomplete();

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

            var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.decimal_dates));
            var startDate = dates[0];
            var endDate = dates[dates.length - 1];
            if (myMap.selector.minIndex != -1 && myMap.selector.maxIndex != -1) {
                startDate = dates[myMap.selector.minIndex];
                endDate = dates[myMap.selector.maxIndex];
            }

            myMap.colorDatasetOnDisplacement(startDate, endDate);
        } else if (selectedColoring === "velocity") {
            myMap.colorDatasetOnVelocity();
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

    $("#graph-div-minimize-button").on("click", function() {
        var container = $(".wrap#charts");
        if (container.hasClass("maximized")) {
            $("#graph-div-maximize-button").css("display", "block");
            container.removeClass("active");
            container.removeClass("maximized");
            container.addClass("minimized");
        }
    });

    $("#graph-div-maximize-button").on("click", function() {
        var container = $(".wrap#charts");
        if (container.hasClass("minimized")) {
            $(this).css("display", "none");
            container.css("display", "block");
            container.addClass("active");
            container.removeClass("minimized");
            container.addClass("maximized");
        }

        $(".wrap#charts").resizable("enable");
        $(".wrap#charts").draggable("enable");
    });

    $("#area-attributes-div-maximize-button").on("click", function(
        event) {
        if (areaAttributesPopup.isMinimized() && currentArea) {
            areaAttributesPopup.maximize(true);
        }
    });

    $("#area-attributes-div-minimize-button").on("click", function(
        event) {
        if (areaAttributesPopup.isMaximized()) {
            areaAttributesPopup.minimize(true);
        }
    });
    // TODO: these minimize buttons are dying to be put into a class
    // to reduce redundant code
    $("#search-form-and-results-minimize-button").on("click", function() {
        // heights in percent
        var container = $("#search-form-and-results-container");
        if (container.hasClass("maximized")) {
            $("#search-form-and-results-maximize-button").css("display", "block");
            container.css("display", "none");
            container.removeClass("maximized");
            container.addClass("minimized");
        }

        myMap.map.resize();
    });

    $("#search-form-and-results-maximize-button").on("click", function() {
        var container = $("#search-form-and-results-container");
        if (container.hasClass("minimized")) {
            $(this).css("display", "none");
            container.css("display", "block");
            container.removeClass("minimized");
            container.addClass("maximized");
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
            if (myMap.areas) {
                var toExclude = currentArea ? [currentArea.properties.unavco_name] : null;
                myMap.addSwathsFromJSON(myMap.areas, toExclude);
            } else {
                myMap.loadAreaMarkers(null);
            }
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
            $("#search-form-and-results-maximize-button").click();
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

    $("#toggle-other-bars").on("click", function() {
        $("#hidden-search-bars-container").toggleClass("active");
        hideAllAutomcompleteSuggestions();
    });

    $(".custom-input-dropdown").on("click", function() {
        if ($(this).attr("id") != "toggle-other-bars") {
            if ($(this).hasClass("hide-dropdown")) {
                $(this).prev("input").autocomplete("search", "");
                $(this).removeClass("hide-dropdown").addClass("show-dropdown");
            } else {
                $(this).prev("input").autocomplete("close");
                $(this).removeClass("show-dropdown").addClass("hide-dropdown");
            }
        }
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
            myMap.colorScale.max = max;

            // if they are loaded, refresh them. if aren't loaded, nothing
            // will happen
            myMap.refreshDataset();
            myMap.thirdPartySourcesController.refreshmidasGpsStationMarkers();
        }
    });

    // $("#search-form-results-table").tablesorter();
});
