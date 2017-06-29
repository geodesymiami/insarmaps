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
var LongValleyRelocToggleButton = null;
var midasEastNorthStationsToggleButton = null;
var irisEarthquakeToggleButton = null;
var myMap = null;

function DivState() {
    this.height = 0;
    this.width = 0;
    this.animating = false;
}

// TODO: make a popup super class and consolidate all popups in here
// also, stick to either active class or minimized/maximized class to denote whether
// popup is shown or not. right now, using one of the two has led to inconsistent code
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
            "unavco_name": true,
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

function ToggleButton(id, container, label) {
    var that = this;
    this.id = id;
    this.container = container;
    this.toggleState = $(this.id).prop('checked') ? ToggleStates.ON :
        ToggleStates.OFF;
    this.onclick = null;
    this.firstToggle = true;

    this.create = function() {
        var html = "<div class='overlay-toggle'>\n";
        if (label) {
            html += "<label>" + label + "</label>\n";
        }
        html += "<input id='" + this.id + "' type='checkbox' name='overlayToggle'/></div>";
        $("#" + container).append(html);
    };

    this.toggle = function() {
        if (this.toggleState == ToggleStates.ON) {
            this.toggleState = ToggleStates.OFF;
            $("#" + this.id).prop('checked', false);
        } else {
            this.toggleState = ToggleStates.ON;
            $("#" + this.id).prop('checked', true);
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
    };

    this.onclick = function(clickFunction) {
        $("#" + this.id).on("click", function() {
            // toggle states
            this.toggle();

            if (clickFunction) {
                clickFunction();
            }
        }.bind(this));
    };

    this.click = function() {
        $("#" + this.id).click();
    };

    this.setDescription = function(description) {
        if (this.container) {
            var html = "<div class='circular-question-mark black-on-white-tooltip' data-toggle='tooltip'";
            html += " title='" + description + "'><b>?</b></div>";
            $(html).insertAfter($("#" + this.container + " input#" + this.id + ""));
        }
    };

    // add it to the DOM
    if (container) {
        this.create();
    }
}

function switchLayer(layer) {
    // TODO: consider making map controller own set paint property etc, to avoid
    // having to process attributes when we switch styles
    if (currentArea) {
        myMap.map.once("data", function() {
            var attributesController = new AreaAttributesController(myMap, currentArea);
            attributesController.processAttributes();
        });
    }
    var layerID = layer.target.id;
    myMap.setBaseMapLayer(layerID);
}

function setupToggleButtons() {
    /*TOGGLE BUTTON*/
    // TODO: the onclick callbacks are screaming to have the toggle state
    // passed into them...
    overlayToggleButton = new ToggleButton("overlay-toggle-button", "overlay-options-toggles", "Data overlay");
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
    dotToggleButton = new ToggleButton("dot-toggle-button");
    dotToggleButton.onclick(function() {
        if (dotToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.connectDots();
        } else {
            myMap.graphsController.disconnectDots();
        }
    });

    secondGraphToggleButton = new ToggleButton(
        "second-graph-toggle-button");
    secondGraphToggleButton.onclick(function() {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.prepareForSecondGraph();
        } else {
            myMap.graphsController.removeSecondGraph();
        }
    });

    regressionToggleButton = new ToggleButton("regression-toggle-button");
    regressionToggleButton.onclick(function() {
        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.addRegressionLines();
        } else {
            myMap.graphsController.removeRegressionLines();
        }
    });

    detrendToggleButton = new ToggleButton("detrend-toggle-button");
    detrendToggleButton.onclick(function() {
        if (detrendToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.detrendData();
        } else {
            myMap.graphsController.removeDetrend();
        }
    });

    topGraphToggleButton = new ToggleButton("top-graph-toggle-button");
    topGraphToggleButton.onclick(function() {
        if (topGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.selectedGraph = "Top Graph";
            bottomGraphToggleButton.set("off");
        } else {
            myMap.graphsController.selectedGraph = "Bottom Graph";
        }
    });
    bottomGraphToggleButton = new ToggleButton(
        "bottom-graph-toggle-button");
    bottomGraphToggleButton.onclick(function() {
        if (bottomGraphToggleButton.toggleState == ToggleStates.ON) {
            myMap.graphsController.selectedGraph = "Bottom Graph";
            topGraphToggleButton.set("off");
        } else {
            myMap.graphsController.selectedGraph = "Top Graph";
        }
    });

    contourToggleButton = new ToggleButton("contour-toggle-button", "overlay-options-toggles", "Contour Lines");
    contourToggleButton.onclick(function() {
        if (contourToggleButton.toggleState == ToggleStates.ON) {
            myMap.addContourLines();
        } else {
            myMap.removeContourLines();
        }
    });

    gpsStationsToggleButton = new ToggleButton("gps-stations-toggle-button", "overlay-options-toggles", "GPS Stations (UNR)");
    gpsStationsToggleButton.onclick(function() {
        if (gpsStationsToggleButton.toggleState == ToggleStates.ON) {
            // gpsStations global variable from gpsStations.js
            myMap.thirdPartySourcesController.addGPSStationMarkers(gpsStations);
        } else {
            myMap.thirdPartySourcesController.removeGPSStationMarkers();
        }
    });
    gpsStationsToggleButton.setDescription("UNR GPS Stations");

    midasEastNorthStationsToggleButton = new ToggleButton("midas-east-north-stations-toggle-button", "overlay-options-toggles", "MIDAS IGS08 Horizontal (UNR)");
    midasEastNorthStationsToggleButton.onclick(function() {
        if (midasEastNorthStationsToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadmidasGpsStationMarkers(true);
        } else {
            myMap.thirdPartySourcesController.removemidasGpsStationMarkers(true);
        }
    });

    midasEastNorthStationsToggleButton.setDescription("Midas Horizontal Velocity Vectors");

    midasStationsToggleButton = new ToggleButton("midas-stations-toggle-button", "overlay-options-toggles", "MIDAS IGS08 Vertical (UNR)");
    midasStationsToggleButton.onclick(function() {
        if (midasStationsToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadmidasGpsStationMarkers(false);
        } else {
            myMap.thirdPartySourcesController.removemidasGpsStationMarkers(false);
        }
    });

    midasStationsToggleButton.setDescription("Midas Stations");

    usgsEarthquakeToggleButton = new ToggleButton("usgs-earthquake-toggle-button", "overlay-options-toggles", "USGS 30 Day Earthquake Feed");
    usgsEarthquakeToggleButton.onclick(function() {
        if (usgsEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadUSGSEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeUSGSEarthquakeFeed();
        }
    });

    usgsEarthquakeToggleButton.setDescription("USGS 30-Day Feed");

    IGEPNEarthquakeToggleButton = new ToggleButton("IGEPN-earthquake-toggle-button", "overlay-options-toggles", "IGEPN Earthquake Feed");
    IGEPNEarthquakeToggleButton.onclick(function() {
        if (IGEPNEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadIGEPNEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeIGEPNEarthquakeFeed();
        }
    });

    IGEPNEarthquakeToggleButton.setDescription("IGEPN EarthQuake Data");

    HawaiiRelocToggleButton = new ToggleButton("Hawaii-reloc-toggle-button", "overlay-options-toggles", "Hawaii Relocation (UM)");
    HawaiiRelocToggleButton.onclick(function() {
        if (HawaiiRelocToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadHawaiiReloc();
        } else {
            myMap.thirdPartySourcesController.removeHawaiiReloc();
        }
    });

    HawaiiRelocToggleButton.setDescription("Hawaii Reloc Data");

    LongValleyRelocToggleButton = new ToggleButton("Long-Valley-reloc-toggle-button", "overlay-options-toggles", "Long Valley Relocation (UM)");
    LongValleyRelocToggleButton.onclick(function() {
        if (LongValleyRelocToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadLongValleyReloc();
        } else {
            myMap.thirdPartySourcesController.removeLongValleyReloc();
        }
    });

    LongValleyRelocToggleButton.setDescription("Long Valley Reloc Data");

    irisEarthquakeToggleButton = new ToggleButton("IRIS-earthquake-toggle-button", "overlay-options-toggles", "IRIS Earthquake");
    irisEarthquakeToggleButton.onclick(function() {
        if (irisEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            irisEarthquakeToggleButton.set("off");
            var $container = $(".wrap#iris-options");

            if (!$container.hasClass("active")) {
                $container.addClass("active");
            }
        } else {
            myMap.thirdPartySourcesController.removeIRISEarthquake();
        }
    });

    irisEarthquakeToggleButton.setDescription("IRIS Earthquake Data");

    recentDatasetsToggleButton = new ToggleButton("recent-datasets-toggle-button")
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
                "properties.mission", "properties.reference"
            ]
        });
        var countries = fuse.search(query);
        if (countries.length === 0) {
            return;
        }

        var searcher = new SearchFormController("search-form");
        searcher.populateSearchResultsTable(countries);
    }
}

function slideFunction(event, ui) {
    // start at 1 to avoid base map layer
    for (var i = 1; i <= currentArea.properties.num_chunks; i++) {
        var layerName = "chunk_" + i;
        var newOpacity = ui.value / 100.0;
        newOpacity *= newOpacity * newOpacity; // scale it, as the default scale is not very linear

        myMap.map.setPaintProperty(layerName, "circle-opacity", newOpacity);
    }
}

function showBrowserAlert() {
    var isChrome = !!window.chrome && !!window.chrome.webstore
    if (!isChrome && !localStorage.getItem("showedBrowserAlert")) {
        alert("Warning: This website relies on Mapbox GL JS, which in turn relies on WebGL. As it stands," + " Google Chrome offers the best compatibility when browsing this site.");
        localStorage.setItem("showedBrowserAlert", "true");
    }
}
// when site loads, turn toggle on
$(window).on("load", function() {
    showBrowserAlert();

    $(window).on('hashchange', function(e) {
        history.replaceState("", document.title, e.originalEvent.oldURL);
    });

    var NUM_CHUNKS = 300;

    // inheritance of LineSelector class (TODO: put all these inheritance setups in own function)
    FeatureSelector.prototype = new SquareSelector();
    AreaFilterSelector.prototype = new SquareSelector();
    LineSelector.prototype = new SquareSelector();
    setupFeatureSelector();
    setUpAreaFilterSelector();
    // and of graphs controllers
    GraphsController.prototype = new AbstractGraphsController();
    SeismicityGraphsController.prototype = new AbstractGraphsController();
    CustomHighchartsSlider.prototype = new AbstractGraphsController();
    CustomSliderSeismicityController.prototype = new SeismicityGraphsController();
    myMap = new MapController(loadJSON);
    myMap.addMapToPage("map-container");
    GraphsController.prototype.map = myMap;
    SeismicityGraphsController.prototype.map = myMap;
    setupGraphsController();
    setupSeismicityGraphsController();
    setupCustomHighchartsSlider();
    setupCustomSliderSeismicityController()
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
            throw new Error("Invalid dropdown selection");
        }
    });

    $("#iris-options-minimize-button").on("click", function() {
        var $container = $(".wrap#iris-options");

        if ($container.hasClass("active")) {
            $container.removeClass("active");
        }

    });

    $("#iris-options-submit-button").on("click", function() {
        myMap.thirdPartySourcesController.removeIRISEarthquake(); // in case it is enabled
        myMap.thirdPartySourcesController.loadIRISEarthquake();
        irisEarthquakeToggleButton.set("on");
        $("#iris-options-minimize-button").click();
    });

    $("#color-scale .color-scale-text-div").on("click", function() {
        var selectedColoring = null;
        var title = $(this).attr("data-original-title");

        myMap.colorScale.setTopAsMax(false);
        $seismicityColoringButtons = $(".seismicity-chart-set-coloring-button");
        if (title === "Color Seismicity on Time") {
            selectedColoring = "time";
            $(this).attr("data-original-title", "Color Seismicity on Depth");
            myMap.colorScale.setInDateMode(true);
            myMap.colorScale.setMinMax(myMap.seismicityGraphsController.minMilliseconds, myMap.seismicityGraphsController.maxMilliseconds);
            $seismicityColoringButtons.attr("data-original-title", "Color On Time")
            $seismicityColoringButtons.click();
        } else if (title === "Color Seismicity on Depth") {
            selectedColoring = "depth";
            $(this).attr("data-original-title", "Color Seismicity on Time");
            myMap.colorScale.setInDateMode(false);
            myMap.colorScale.setMinMax(0, 50);
            $seismicityColoringButtons.attr("data-original-title", "Color On Depth")
            $seismicityColoringButtons.click();
        }

        myMap.thirdPartySourcesController.recolorSeismicities(selectedColoring);
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
    // $(".wrap#charts").tooltip("disable");
    // $(".wrap#area-attributes-div").tooltip("disable");

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

            if (!myMap.pointClicked()) {
                $("#chartContainer").html("<h2>Select a timeseries point</h2>")
            }
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

        // minimize subset swath if it is up
        $subsetSwathPopup = $("#subset-swath-popup");
        if ($subsetSwathPopup.hasClass("active")) {
            $subsetSwathPopup.removeClass("active");
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

    // TODO: again, these minimize buttons are dying to be abstracted into a class along with
    // other toggable, 2 state items
    $("#seismicity-charts-minimize-button").on("click", function() {
        var $container = $(".wrap#seismicity-charts");
        if ($container.hasClass("active")) {
            $container.removeClass("active");
            $("#seismicity-charts-maximize-button").css("display", "block");
            myMap.selector.removeSelectionPolygon();
        }
    });

    $("#seismicity-charts-maximize-button").on("click", function() {
        var $container = $(".wrap#seismicity-charts");
        if (!$container.hasClass("active")) {
            $container.addClass("active");
            $(this).css("display", "none");

            // charts destroyed? add message saying user needs to select bounding box
            if ($("#depth-vs-long-graph").find(".highcharts-container").length == 0) {
                // we use visibility and not display for the contents because there seems to be a race
                // condition between browser rendering the contents of the div and highcharts
                // creating the plots. This leads to some plots being cut off (I guess highcharts begins)
                // creating before browser has rendered. I'm no expert so this is just a conjecture.
                $(".wrap#seismicity-charts > .content").css("visibility", "hidden");
                $("#seismicity-wrap-placeholder-text").css("display", "block");
            }
        }
    });

    $("#seismicity-chart-sliders-minimize-button").on("click", function() {
        var $container = $(".wrap#seismicity-chart-sliders");
        if ($container.hasClass("active")) {
            $container.removeClass("active");
            $("#seismicity-chart-sliders-maximize-button").css("display", "block");
        }
    });

    $("#seismicity-chart-sliders-maximize-button").on("click", function() {
        var $container = $(".wrap#seismicity-chart-sliders");
        if (!$container.hasClass("active")) {
            $container.addClass("active");
            $(this).css("display", "none");
        }
    });

    // this website is begging for a toggable abstract class...
    $(".seismicity-chart-set-coloring-button").on("click", function() {
        var selectedColoring = null;
        var targetGraph = $(this).data().chartType;
        var tooltipValue = $(this).attr("data-original-title");
        if (tooltipValue === "Color On Time") {
            selectedColoring = "time";
            $(this).html("Time-colored");
            $(this).attr("data-original-title", "Color On Depth");
        } else { // depth class or no class we take as depth coloring
            selectedColoring = "depth";
            $(this).html("Depth-colored");
            $(this).attr("data-original-title", "Color On Time");
        }
        myMap.seismicityGraphsController.seismicityColorings[targetGraph] = selectedColoring;
        myMap.seismicityGraphsController.createChart(selectedColoring, targetGraph, null, null);
    });

    $("#switch-to-distribution-button").on("click", function() {
        var tooltipValue = $(this).attr("data-original-title");
        if (tooltipValue === "Switch To Distribution") {
            $(this).attr("data-original-title", "Switch To Cumulative");
            $(this).html("Distribution");
        } else {
            $(this).attr("data-original-title", "Switch To Distribution");
            $(this).html("Cumulative");
        }

        // this chart takes of care of checking this button's state so we don't have to pass in the state
        // and refactor alot of code. But maybe it's more elegant to pass it in... might refactor in future
        myMap.seismicityGraphsController.createChart(null, "cumulative-events-vs-date-graph", null, null);
    });

    $(".wrap#seismicity-chart-sliders, .wrap#seismicity-charts, .wrap#cross-section-charts, .wrap#iris-options").draggable({
        start: function(event, ui) {
            $(this).addClass("disable-transitions");
        },
        stop: function(event, ui) {
            $(this).removeClass("disable-transitions");
        }
    });

    $("#cross-section-charts-maximize-button").on("click", function() {
        var $container = $(".wrap#cross-section-charts");
        if (!$container.hasClass("active")) {
            $container.addClass("active");
            $(this).css("display", "none");
            myMap.selector.createOnlyCrossSectionPlots();
        }
    });

    $("#cross-section-charts-minimize-button").on("click", function() {
        var $container = $(".wrap#cross-section-charts");
        if ($container.hasClass("active")) {
            $container.removeClass("active");
            $("#cross-section-charts-maximize-button").css("display", "block");
        }
    });

    $(".slider-range-button").on("click", function() {
        var sliderName = $(this).data().sliderType;
        myMap.seismicityGraphsController.zoomSliderToCurrentRange(sliderName);
    });

    $(".slider-reset-button").on("click", function() {
        var sliderName = $(this).data().sliderType;
        myMap.seismicityGraphsController.resetSliderRange(sliderName);
    });

    // chart div resizable
    $(".wrap#charts").resizable({
        animateDuration: "fast",
        animateEasing: "linear",
        start: function(event, ui) {
            $(this).addClass("disable-transitions");
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
            $(this).removeClass("disable-transitions");
            myMap.graphsController.resizeChartContainers();
            myMap.graphsController.recreateGraphs();
        }
    }).draggable({
        start: function(event, ui) {
            $(this).addClass("disable-transitions");
        },
        stop: function(event, ui) {
            $(this).removeClass("disable-transitions");
        }
    });

    $("#information-button").on("click", function() {
        $("#information-div.overlay-div").toggleClass("active");
    });

    $("#close-information-button").on("click", function() {
        $("#information-div.overlay-div").toggleClass("active");
    });

    $(function() {
        $('[data-toggle="tooltip"]').tooltip({ trigger: "hover" });
    });

    $("#square-selector-button").on("click", function() {
        myMap.selector.toggleMode();
    });

    // TODO: need to consolidate this if has class pattern into Toggable Class
    // We can also have a class for square selector type square buttons if he wants more
    $("#dataset-frames-toggle-button").on("click", function() {
        if ($(this).hasClass("toggled")) {
            myMap.loadSwathsInCurrentViewport(true);
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
                if (currentArea && currentArea.properties.num_chunks >
                    NUM_CHUNKS) {
                    slideFunction(event, ui);
                }
            },
            slide: function(event, ui) {
                // call slide only if sufficiently small amount of layers, otherwise lag
                if (currentArea && currentArea.properties.num_chunks <=
                    NUM_CHUNKS) {
                    slideFunction(event, ui);
                }
            }
        });
    });

    // enter key triggers go button for search
    $("#search-input").keypress(function(event) {
        const ENTER_KEY = 13;

        if (event.keyCode == ENTER_KEY && $(this).val()) {
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

    // jQuery datepicker for crossbrowser consistency
    $(".date-input").datepicker({
        changeMonth: true, changeYear: true,
        dateFormat: "y-M-d"
    });
    // $("#search-form-results-table").tablesorter();
});
