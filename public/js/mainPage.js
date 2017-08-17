var overlayToggleButton = null;
var dotToggleButton = null;
var secondGraphToggleButton = null;
var regressionToggleButton = null;
var detrendToggleButton = null;
var topGraphToggleButton = null;
var bottomGraphToggleButton = null;
var gpsStationsToggleButton = null;
var midasStationsToggleButton = null;
var usgsEarthquakeToggleButton = null;
var IGEPNEarthquakeToggleButton = null;
var HawaiiRelocToggleButton = null;
var LongValleyRelocToggleButton = null;
var midasEastNorthStationsToggleButton = null;
var USGSEventsEarthquakeToggleButton = null;
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
    this.label = label;
    this.toggleState = $(this.id).prop('checked') ? ToggleStates.ON :
        ToggleStates.OFF;
    this.onclick = null;
    this.firstToggle = true;

    this.create = function() {
        var html = "<div class='overlay-toggle'>\n";
        if (this.label) {
            html += "<label>" + this.label + "</label>\n";
        }
        html += "<input id='" + this.id + "' type='checkbox' name='overlayToggle'/></div>";
        $("#" + this.container).append(html);
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

    this.clickFunction = null;

    this.set = function(state, execOnClick) {
        if (state == "on") {
            if (this.toggleState == ToggleStates.OFF) {
                this.toggle();

                if (execOnClick && this.clickFunction) {
                    this.clickFunction();
                }
            }
        } else if (state == "off") {
            if (this.toggleState == ToggleStates.ON) {
                this.toggle();
                if (execOnClick && this.clickFunction) {
                    this.clickFunction();
                }
            }
        } else {
            throw "invalid toggle option";
        }
    };

    this.onclick = function(clickFunction) {
        $("#" + this.id).on("click", function(e) {
            // toggle states
            this.toggle();

            if (clickFunction) {
                this.clickFunction = clickFunction;
                clickFunction(e);
            }
        }.bind(this));
    };

    this.click = function() {
        $("#" + this.id).click();
    };

    this.setDescription = function(description) {
        if (this.container) {
            var html = "<div class='circular-question-mark black-on-white-tooltip' data-toggle='tooltip' data-html='true' data-placement='right'";
            html += " title=\"" + description + "\"><b>?</b></div>";
            $(html).insertAfter($("#" + this.container + " input#" + this.id + ""));
        }
    };

    // add it to the DOM
    if (container) {
        this.create();
    }
}

function SeismicityToggleButton(id, container, label) {
    this.id = id;
    this.container = container;
    this.label = label;

    if (container) {
        this.create();
    }
}

function setupSeismicityToggleButton() {
    SeismicityToggleButton.prototype.onclick = function(clickFunction) {
        $("#" + this.id).on("click", function(e) {
            // toggle states
            this.toggle();

            if (clickFunction) {
                this.clickFunction = clickFunction;

                // allow multiple selection only if ctrl key is pressed
                if (this.toggleState == ToggleStates.ON && !e.ctrlKey) {
                    myMap.thirdPartySourcesController.removeAll(this);
                }
                clickFunction(e);
            }
        }.bind(this));
    };
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
    overlayToggleButton = new ToggleButton("overlay-toggle-button", "overlay-options-toggles", "Insar");
    overlayToggleButton.onclick(function() {
        // on? add layers, otherwise remove them
        if (overlayToggleButton.toggleState == ToggleStates.ON) {
            if (!myMap.anAreaWasPreviouslyLoaded()) {
                overlayToggleButton.set("off");
                return;
            }

            $("#overlay-slider").slider("value", 100);
            myMap.loadDatasetFromFeature(currentArea);
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

    gpsStationsToggleButton = new ToggleButton("gps-stations-toggle-button", "overlay-options-toggles", "GPS Stations (UNR)");
    gpsStationsToggleButton.onclick(function() {
        if (gpsStationsToggleButton.toggleState == ToggleStates.ON) {
            // gpsStations global variable from gpsStations.js
            myMap.thirdPartySourcesController.addGPSStationMarkers(gpsStations);
        } else {
            myMap.thirdPartySourcesController.removeGPSStationMarkers();
        }
    });
    gpsStationsToggleButton.setDescription("GPS solutions provided by the University of Nevada Geodesy Lab at <a target='_blank' href='http://geodesy.unr.edu'>http://geodesy.unr.edu/</a>");

    midasEastNorthStationsToggleButton = new ToggleButton("midas-east-north-stations-toggle-button", "overlay-options-toggles", "MIDAS IGS08 Horizontal (UNR)");
    midasEastNorthStationsToggleButton.onclick(function() {
        if (midasEastNorthStationsToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadmidasGpsStationMarkers(true);
        } else {
            myMap.thirdPartySourcesController.removemidasGpsStationMarkers(true);
        }
    });

    midasEastNorthStationsToggleButton.setDescription("MIDAS horizontal velocity field provided by the University of Nevada Geodesy Lab at <a target='_blank' href='http://geodesy.unr.edu'>http://geodesy.unr.edu/</a>");

    midasStationsToggleButton = new ToggleButton("midas-stations-toggle-button", "overlay-options-toggles", "MIDAS IGS08 Vertical (UNR)");
    midasStationsToggleButton.onclick(function() {
        if (midasStationsToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadmidasGpsStationMarkers(false);
        } else {
            myMap.thirdPartySourcesController.removemidasGpsStationMarkers(false);
        }
    });

    midasStationsToggleButton.setDescription("MIDAS vertical velocity field provided by the University of Nevada Geodesy Lab at <a target='_blank' href='http://geodesy.unr.edu'>http://geodesy.unr.edu/</a>");

    usgsEarthquakeToggleButton = new SeismicityToggleButton("usgs-earthquake-toggle-button", "overlay-options-toggles", "USGS 30 Day Earthquake Feed");
    usgsEarthquakeToggleButton.onclick(function() {
        if (usgsEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadUSGSEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeUSGSEarthquakeFeed();
        }
    });

    usgsEarthquakeToggleButton.setDescription("Recent earthquakes from <a target='_blank' href='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'>https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson/</a>");

    USGSEventsEarthquakeToggleButton = new SeismicityToggleButton("USGSEvents-earthquake-toggle-button", "overlay-options-toggles", "USGS Events");
    USGSEventsEarthquakeToggleButton.onclick(function() {
        if (USGSEventsEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            var $container = $(".wrap#USGSEvents-options");

            if (!$container.hasClass("active")) {
                $container.addClass("active");
            }
        } else {
            myMap.thirdPartySourcesController.removeUSGSEventsEarthquake();
        }
    });

    USGSEventsEarthquakeToggleButton.setDescription("Full USGS events catalogs from <a target='_blank' href='http://earthquake.usgs.gov/fdsnws/event/1/'>http://earthquake.usgs.gov/fdsnws/event/1/</a>");

    IGEPNEarthquakeToggleButton = new SeismicityToggleButton("IGEPN-earthquake-toggle-button", "overlay-options-toggles", "IGEPN 30 Day Earthquake Feed");
    IGEPNEarthquakeToggleButton.onclick(function() {
        if (IGEPNEarthquakeToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadIGEPNEarthquakeFeed();
        } else {
            myMap.thirdPartySourcesController.removeIGEPNEarthquakeFeed();
        }
    });

    IGEPNEarthquakeToggleButton.setDescription("Recent earthquakes provided by the Instituto Geofisico, Quito, Ecuador at <a target='_blank' href='http://www.igepn.edu.ec/portal/eventos/www/events.xml'>http://www.igepn.edu.ec/portal/eventos/www/events.xml</a>");

    HawaiiRelocToggleButton = new SeismicityToggleButton("Hawaii-reloc-toggle-button", "overlay-options-toggles", "Hawaii 1992-2008 Relocations");
    HawaiiRelocToggleButton.onclick(function() {
        if (HawaiiRelocToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadHawaiiReloc();
        } else {
            myMap.thirdPartySourcesController.removeHawaiiReloc();
        }
    });

    HawaiiRelocToggleButton.setDescription("Relocated earthquakes provided by the University of Miami at <a target='_blank' href='http://www.rsmas.miami.edu/users/glin/Hawaii.html'>http://www.rsmas.miami.edu/users/glin/Hawaii.html</a>");

    LongValleyRelocToggleButton = new SeismicityToggleButton("Long-Valley-reloc-toggle-button", "overlay-options-toggles", "Long Valley 1984-2014 Relocations.");
    LongValleyRelocToggleButton.onclick(function() {
        if (LongValleyRelocToggleButton.toggleState == ToggleStates.ON) {
            myMap.thirdPartySourcesController.loadLongValleyReloc();
        } else {
            myMap.thirdPartySourcesController.removeLongValleyReloc();
        }
    });

    LongValleyRelocToggleButton.setDescription("Relocated earthquakes provided by the University of Miami at <a target='_blank' href='http://www.rsmas.miami.edu/users/glin/Mammoth_Mountain.html'>http://www.rsmas.miami.edu/users/glin/Mammoth_Mountain.html/</a>");

    // we really need a generic toggable base class :c. too much work for now
    // for little gain
    $("#recent-datasets-toggle-button").on("click", function() {
        if ($(this).html() === "Last year data") {
            $(this).html("All data");
            $(this).removeClass("toggled");
        } else {
            $(this).html("Last year data");
            $(this).addClass("toggled");
        }

        new SearchFormController("search-form").search();
        $("#search-form-and-results-maximize-button").click();
    });
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
    SeismicityToggleButton.prototype = new ToggleButton();
    myMap = new MapController(loadJSON);
    myMap.addMapToPage("map-container");
    GraphsController.prototype.map = myMap;
    SeismicityGraphsController.prototype.map = myMap;
    setupGraphsController();
    setupSeismicityGraphsController();
    setupCustomHighchartsSlider();
    setupCustomSliderSeismicityController()
    populateSearchAutocomplete();
    setupSeismicityToggleButton();

    var layerList = document.getElementById('map-type-menu');
    var inputs = layerList.getElementsByTagName('input');

    for (var i = 0; i < inputs.length; i++) {
        inputs[i].onclick = switchLayer;
    }

    setupToggleButtons();

    $("#hide-show-seismicities-button").on("click", function() {
        if (myMap.getCurrentMode() !== "seismicity") {
            return;
        }
        if ($(this).html() === "Hide seismicity") {
            myMap.thirdPartySourcesController.hideAllSeismicities();
            $(this).html("Show seismicity");
        } else {
            myMap.thirdPartySourcesController.showAllSeismicities();
            $(this).html("Hide seismicity");
        }
    });

    $("#USGSEvents-options-minimize-button").on("click", function() {
        var $container = $(".wrap#USGSEvents-options");

        if ($container.hasClass("active")) {
            $container.removeClass("active");
        }

        if (!myMap.map.getLayer("USGSEventsEarthquake")) {
            USGSEventsEarthquakeToggleButton.set("off");
        }
    });

    $("#USGSEvents-options-submit-button").on("click", function() {
        myMap.thirdPartySourcesController.removeUSGSEventsEarthquake(); // in case it is enabled
        myMap.thirdPartySourcesController.loadUSGSEventsEarthquake();

        // minimize the window after submit
        var $container = $(".wrap#USGSEvents-options");
        if ($container.hasClass("active")) {
            $container.removeClass("active");
        }
    });

    $("#color-scale .color-scale-text-div").on("click", function() {
        var selectedColoring = null;
        var title = $(this).attr("data-original-title");

        myMap.colorScale.setTopAsMax(false);
        var curMode = myMap.getCurrentMode();
        if (curMode === "insar") {
            if (title === "Color on displacement") {
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
                $(this).attr("data-original-title", "Color on velocity");
            } else if (title === "Color on velocity") {
                myMap.colorDatasetOnVelocity();
                $(this).attr("data-original-title", "Color on displacement");
            }
        } else if (curMode === "seismicity") {
            $seismicityColoringButtons = $(".seismicity-chart-set-coloring-button");
            if (title === "Color on time") {
                selectedColoring = "time";
                $(this).attr("data-original-title", "Color on depth");
                myMap.colorScale.setInDateMode(true);
                myMap.colorScale.setMinMax(myMap.seismicityGraphsController.timeRange.min, myMap.seismicityGraphsController.timeRange.max);
                $seismicityColoringButtons.attr("data-original-title", "Color on time")
                $seismicityColoringButtons.click();
            } else if (title === "Color on depth") {
                selectedColoring = "depth";
                $(this).attr("data-original-title", "Color on time");
                myMap.colorScale.setInDateMode(false);
                myMap.colorScale.setMinMax(myMap.seismicityGraphsController.depthRange.min, myMap.seismicityGraphsController.depthRange.max);
                $seismicityColoringButtons.attr("data-original-title", "Color on depth")
                $seismicityColoringButtons.click();
            }

            myMap.thirdPartySourcesController.recolorSeismicities(selectedColoring);
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
    // $(".wrap#charts").tooltip("disable");
    // $(".wrap#area-attributes-div").tooltip("disable");

    $(".maximize-button").on("click", function() {
        $(this).css("display", "none");
    });

    $("#graph-div-minimize-button").on("click", function() {
        var container = $(".wrap#charts");
        if (container.hasClass("maximized")) {
            $("#graph-div-maximize-button").css("display", "block");
            container.removeClass("active");
            container.removeClass("maximized");
            container.addClass("minimized");
            myMap.removeTouchLocationMarkers();
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

    // hide subset swath popup after we aren't hovering over it
    $("#subset-swath-popup").mouseleave(function() {
        $(this).removeClass("active");
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
        if (!$container.hasClass("active") && !myMap.seismicityGraphsController.crossSectionChartsVisible()) {
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
        if (tooltipValue === "Color on time") {
            selectedColoring = "time";
            $(this).html("Time-colored");
            $(this).attr("data-original-title", "Color on depth");
        } else { // depth class or no class we take as depth coloring
            selectedColoring = "depth";
            $(this).html("Depth-colored");
            $(this).attr("data-original-title", "Color on time");
        }
        myMap.seismicityGraphsController.seismicityColorings[targetGraph] = selectedColoring;
        myMap.seismicityGraphsController.createChart(selectedColoring, targetGraph, null, null);
    });

    $("#switch-to-distribution-button").on("click", function() {
        var tooltipValue = $(this).attr("data-original-title");
        if (tooltipValue === "Switch to distribution") {
            $(this).attr("data-original-title", "Switch to cumulative");
            $(this).html("Distribution");
        } else {
            $(this).attr("data-original-title", "Switch to distribution");
            $(this).html("Cumulative");
        }

        // this chart takes of care of checking this button's state so we don't have to pass in the state
        // and refactor alot of code. But maybe it's more elegant to pass it in... might refactor in future
        myMap.seismicityGraphsController.createChart(null, "cumulative-events-vs-date-graph", null, null);
    });

    $(".wrap#seismicity-chart-sliders, .wrap#seismicity-charts, .wrap#cross-section-charts, .wrap#USGSEvents-options").draggable({
        start: function(event, ui) {
            $(this).addClass("disable-transitions");
        },
        stop: function(event, ui) {
            $(this).removeClass("disable-transitions");
        }
    });

    $("#cross-section-charts-maximize-button").on("click", function() {
        var $container = $(".wrap#cross-section-charts");
        if (!$container.hasClass("active") && !myMap.seismicityGraphsController.chartsVisible()) {
            $container.addClass("active");
            $(this).css("display", "none");
            myMap.selector.createOnlyCrossSectionPlots(null);
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

    $("#set-insar-time-range-to-seismicity-button").on("click", function() {
        if (myMap.selector.minIndex != -1 && myMap.selector.maxIndex != -1) {
            var insarDates = myMap.graphsController.graphSettings["chartContainer"].navigatorEvent;
            var seismicityDates = myMap.seismicityGraphsController.timeRange;
            // make sure insardates are within seismicity dates, capping them at seismicity extremes otherwise
            var minMilliSeconds = seismicityDates.min;
            var maxMilliseconds = seismicityDates.max;
            if (insarDates.max < maxMilliseconds && insarDates.max > minMilliSeconds) {
                maxMilliseconds = insarDates.max;
            }
            if (insarDates.min > minMilliSeconds && insarDates.min < maxMilliseconds) {
                minMilliSeconds = insarDates.min;
            }

            myMap.seismicityGraphsController.timeSlider.setMinMax(minMilliSeconds, maxMilliseconds);
        }
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

    // setup tooltips
    $("[data-toggle='tooltip']").not($(".circular-question-mark")).tooltip({ trigger: "hover" });

    // for question mark seismicity tooltips, allow hovering over them in case
    // there is a link
    $(".circular-question-mark").tooltip({ trigger: "manual" }).hover(function() {
        var that = this;
        $(this).tooltip("show");
        $(".tooltip").on("mouseleave", function() {
            $(that).tooltip('hide');
        });
    }, function() {
        var that = this;
        setTimeout(function() {
            if (!$(".tooltip:hover").length) {
                $(that).tooltip("hide");
            }
        }, 300);
    });

    $("#square-selector-button").on("click", function() {
        myMap.selector.toggleMode();
    });

    // TODO: need to consolidate this if has class pattern into Toggable Class
    // We can also have a class for square selector type square buttons if he wants more
    $("#dataset-frames-toggle-button").on("click", function() {
        if ($(this).hasClass("toggled")) {
            myMap.loadSwathsInCurrentViewport(true);
            $(this).attr("data-original-title", "Hide swaths");
            $(this).removeClass("toggled");
        } else {
            myMap.removeAreaMarkers();
            $(this).attr("data-original-title", "Show swaths");
            $(this).addClass("toggled");
        }
    });

    $("#contour-toggle-button").on("click", function() {
        if ($(this).hasClass("toggled")) {
            myMap.removeContourLines();
            $(this).attr("data-original-title", "Add contour lines");
            $(this).removeClass("toggled");
        } else {
            myMap.addContourLines();
            $(this).attr("data-original-title", "Remove contour lines");
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

    $("#download-as-text-button").click(function() {
        window.open("/textFile/" + currentArea.properties.unavco_name +
            "/" + currentPoint);
    });

    // jQuery datepicker for crossbrowser consistency
    $(".date-input").datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: "yy-M-d"
    });

    $("#magnitude-scale").on("click", function() {
        if ($(this).attr("data-original-title") === "Shrink relative scale") {
            $(this).attr("data-original-title", "Expand relative scale");
            myMap.thirdPartySourcesController.resizeSeismicities("shrink");
            // everything else is expand
        } else {
            $(this).attr("data-original-title", "Shrink relative scale");
            myMap.thirdPartySourcesController.resizeSeismicities("expand");
        }

        myMap.thirdPartySourcesController.populateSeismicityMagnitudeScale();
    });
    // $("#search-form-results-table").tablesorter();
});
