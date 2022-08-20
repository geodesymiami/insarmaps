//tippecanoe geo_timeseries_masked_original.json -pf -pk -Bg -d9 -D7 -g4 -rg -o t.mbtiles
// how to do it with leaflet -
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/

// TODO: date functions need serious refactoring

var currentPoint = 1;
var currentArea = null;
var file = "/home/vagrant/code/insar_map_mvc/public/json/geo_timeseries_masked.h5test_chunk_";
var firstToggle = true;
var myPolygon = null;
var areaAttributesPopup = new AreaAttributesPopup();

// TODO: I feel that this needs to be split up eventually into multiple files
function MapController(loadJSONFunc) {
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    this.startingZoom = 1.6;
    this.datasetZoom = 8.0;
    this.startingCoords = [0, 30];

    this.insarActualPixelSize = false;
    // default zoom and radii of circle geojson features
    this.radiusStops = [
        [5, 2],
        [8, 2],
        [13, 8],
        [21, 16],
        [34, 32]
    ];
    this.highResRadiusStops = [
        [5, 2],
        [8, 2],
        [13, 8],
        [21, 4],
        [34, 2]
    ];
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.geoDataMap = {};
    // maps maintain insertion order. especially useful for maintaining layer orders
    this.layers_ = new Map();
    this.sources = new Map(); // we use this map as a queue of modes, where the last entry is the recoloring mode we are in
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
    this.areaFilterSelector = null;
    this.zoomOutZoom = 7.0;
    this.graphsController = new GraphsController(this);
    this.areas = null;
    this.allAreas = null;
    var COLOR_SCALE_MIN = parseFloat($("#color-scale .bottom-scale-value").val());
    var COLOR_SCALE_MAX = parseFloat($("#color-scale .top-scale-value").val());
    this.insarColorScaleValues = { min: COLOR_SCALE_MIN, max: COLOR_SCALE_MAX };
    this.colorScale = new ColorScale(COLOR_SCALE_MIN, COLOR_SCALE_MAX, "color-scale");
    this.colorScale.onScaleChange(function(newMin, newMax) {
        var curMode = this.getCurrentMode();

        if (curMode) { // no mode (ie essentially empty map)
            if (this.pointsLoaded()) {
                var dates = this.selector.getCurrentStartEndDateFromArea(currentArea);
                this.insarColorScaleValues.min = newMin;
                this.insarColorScaleValues.max = newMax;
                this.refreshDataset(dates.startDate, dates.endDate);
            } else if (curMode === "gps") {
                this.thirdPartySourcesController.refreshmidasGpsStationMarkers();
            }
            appendOrReplaceUrlVar(/&minScale=-?\d*\.?\d*/, "&minScale=" + newMin);
            appendOrReplaceUrlVar(/&maxScale=-?\d*\.?\d*/, "&maxScale=" + newMax);
        }
    }.bind(this));
    this.seismicityColorScale = new ColorScale(COLOR_SCALE_MIN, COLOR_SCALE_MAX, "seismicity-color-scale");
    this.seismicityColorScale.onScaleChange(function(newMin, newMax) {
        var curMode = this.getCurrentMode();

        if (curMode) { // no mode (ie essentially empty map)
            if (curMode === "gps") {
                this.thirdPartySourcesController.refreshmidasGpsStationMarkers();
            } else if (curMode === "seismicity") {
                if (!this.seismicityColorScale.inDateMode) {
                    this.seismicityGraphsController.depthSlider.setMinMax(newMin, newMax);
                } else {
                    this.seismicityGraphsController.timeSlider.setMinMax(newMin, newMax);
                }
                this.thirdPartySourcesController.recolorSeismicities(this.thirdPartySourcesController.currentSeismicityColoring);
            }
        }
    }.bind(this));
    this.colorOnDisplacement = false;
    this.selectingReferencePoint = false;
    // set current coloring mode based on url
    if (urlOptions && urlOptions.startingDatasetOptions &&
        (urlOptions.startingDatasetOptions.minScale ||
        urlOptions.startingDatasetOptions.maxScale)) {
        this.colorOnDisplacement = true;
    }
    this.lastAreasRequest = null;

    this.areaMarkerLayer = new AreaMarkerLayer(this);

    this.thirdPartySourcesController = new ThirdPartySourcesController(this);
    this.seismicityGraphsController = new CustomSliderSeismicityController();

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

    this.cancellableAjax = new CancellableAjax();

    this.previousZoom = this.startingZoom;

    this.lastMode = null;
    this.datasetCurrentlyRecolored = false;
    this.referenceDisplacements = null;

    this.addSource = function(id, source) {
        this.sources.set(id, source);
        this.map.addSource(id, source);
    };

    this.removeSource = function(id) {
        this.sources.delete(id);
        this.map.removeSource(id);
    };

    // old datasets have more than one, new ones should only have one, so consider renaming insar layer eventually.
    // higher index layerID's come below lower indexed ones
    this.layerOrders = (function() {
        const FIRST_INSAR_CHUNK = "chunk_1";
        var allLayers = [this.thirdPartySourcesController.layerOrder, ["DBReferencePoint", "ReferencePoint", "Top Graph", "Bottom Graph", "onTheFlyJSON", FIRST_INSAR_CHUNK]];

        var layerOrders = [];
        allLayers.forEach(function(layersArray) {
            layerOrders = layerOrders.concat(layersArray);
        });

        return layerOrders;
    }).bind(this)();

    this.getLayerOnTopOf = function(layer) {
        for (var i = this.layerOrders.length - 1; i >= 0; i--) {
            if (this.layerOrders[i] === layer) {
                var j = i - 1;
                while (!this.map.getLayer(this.layerOrders[j]) && j > -1) {
                    j--;
                }

                return j == -1 ? null : this.layerOrders[j];
            }
        }

        return null;
    };

    // determine which color scales to show, etc when a layer, and potentially
    // mode, changes
    this.afterLayersChanged = function(layerThatWasChanged) {
        var curMode = this.getCurrentMode();

        // do nothing if it was a swath, regardless of mode, as swaths don't change our mode
        if (layerThatWasChanged.includes("swath-area-")) {
            return;
        }

        if (this.pointsLoaded() || (curMode && curMode === "seismicity")) {
            $(".maximize-buttons-container").removeClass("hidden");
        } else {
            $(".maximize-buttons-container").addClass("hidden");
        }

        $("#magnitude-scale").removeClass("active");
        $("#arrow-length-scale").removeClass("active");
        // this is all quick and dirty.
        // TODO: it needs cleaning up, as what started as an elegant solution has quickly turned into a behemoth
        if (!curMode) { // no mode (ie essentially empty map)
            this.seismicityGraphsController.destroyAllCharts();
            this.seismicityGraphsController.hideChartContainers();
            $(".wrap#charts").removeClass("active");
            this.selector.removeSelectionPolygon();
            $("#seismicity-maximize-buttons-container").removeClass("active");
            $("#insar-maximize-buttons-container").addClass("active");
            this.colorScale.remove();
            this.seismicityColorScale.remove();
            this.loadAreaMarkersThroughButton();
        } else {
            // no seismicity loaded? hide charts. use getTopMostSeismicitySource
            // instead of thirdpartysourcescontroller method which gives us all seismicities
            // cause this seems less resource heavy
            if (!this.getTopMostSeismicitySource()) {
                this.seismicityGraphsController.destroyAllCharts();
                this.seismicityGraphsController.hideChartContainers();
            }
            if (curMode !== "insar") {
                $("#insar-maximize-buttons-container").removeClass("active");
            }
            if (curMode !== "seismicity") {
                this.selector.removeSelectionPolygon();
                $("#seismicity-maximize-buttons-container").removeClass("active");
                $("#square-selector-button").attr("data-original-title", "Select Points");
                if (curMode === "insar") {
                    if (this.lastMode == curMode) {
                        return;
                    }

                    $hideShowInsarButton = $("#hide-show-insar-button");
                    if ($hideShowInsarButton.attr("data-original-title") === "Show") {
                        $hideShowInsarButton.attr("data-original-title", "Hide");
                        $hideShowInsarButton.css("opacity", 1.0);
                    }
                    this.loadAreaMarkersThroughButton();
                    $("#insar-maximize-buttons-container").addClass("active");
                    this.colorScale.setTopAsMax(true);
                    this.colorScale.setInDateMode(false);
                    this.colorScale.initVisualScale();
                    if (this.pointsLoaded()) {
                        $("#insar-seismicity-color-scales-container").css("display", "block");
                        this.colorScale.show();
                        this.colorScale.setTitle("LOS Velocity<br>[cm/yr]");
                    } else {
                        $("#insar-seismicity-color-scales-container").css("display", "none");
                        this.colorScale.remove();
                    }
                    $("#color-scale .color-scale-text-div").attr("data-original-title", "Color on displacement");
                } else if (curMode === "gps") {
                    var layerIDs = this.getLayerIDsInCurrentMode();
                    this.removeAreaMarkersThroughButton();
                    if (layerIDs.includes("midas-arrows")) {
                        $("#arrow-length-scale").addClass("active");
                        this.thirdPartySourcesController.populateMidasHorizontalArrowScale();
                    }
                    if (layerIDs.includes("midas")) {
                        $("#insar-seismicity-color-scales-container").css("display", "block");
                        this.colorScale.show();
                        this.colorScale.setTitle("Vertical Velocity cm/yr");
                    } else {
                        $("#insar-seismicity-color-scales-container").css("display", "none");
                        this.colorScale.remove();
                    }
                }
                // seismicity
            } else {
                this.thirdPartySourcesController.populateSeismicityMagnitudeScale();
                $("#magnitude-scale").addClass("active");
                if (layerThatWasChanged !== "seismicitySelectedArea") {
                    // remove swaths
                    this.removeAreaMarkersThroughButton();
                    $("#square-selector-button").attr("data-original-title", "Select Seismicity");
                    $("#seismicity-color-scale .color-scale-text-div").attr("data-original-title", "Color on time");
                    this.seismicityColorScale.setTopAsMax(false);
                    $("#seismicity-maximize-buttons-container").addClass("active");

                    // don't prepare for seismicities if layer that was changed was on the fly as it means
                    // that we simply received new on the fly json, possibly from a call from the seismicity sliders...
                    // if we prepareforseismicities and the call was from a slider, the slider's start and end ranges
                    // get overriden
                    if (layerThatWasChanged !== "onTheFlyJSON") {
                        this.prepareForSeismicities();
                    }
                }
            }
        }

        this.lastMode = curMode;
    };

    this.prepareForSeismicities = function() {
        var features = this.thirdPartySourcesController.getAllSeismicityFeatures();
        // don't prepare for seismicities if layer that was changed was on the fly as it means
        // that we simply received new on the fly json, possibly from a call from the seismicity sliders...
        // if we prepareforseismicities and the call was from a slider, the slider's start and end ranges
        // get overriden
        if (features.length) {
            $hideShowSeismicitiesButton = $("#hide-show-seismicities-button");
            if ($hideShowSeismicitiesButton.attr("data-original-title") === "Show") {
                $hideShowSeismicitiesButton.click();
            }

            features.sort(function(feature1, feature2) {
                return feature1.properties.time - feature2.properties.time;
            });
            // handles setting up color scale for seismicity etc.
            this.thirdPartySourcesController.prepareForSeismicities(features);
        }
    };

    this.addLayer = function(newLayer, before) {
        // handle when before layerID is supplied
        if (before) {
            var tempLayers = new Map();
            this.layers_.forEach(function(layer, layerID) {
                if (layerID === before) {
                    tempLayers.set(newLayer.id, newLayer);
                }

                tempLayers.set(layerID, layer);
            });
            this.layers_ = tempLayers;
        } else {
            this.layers_.set(newLayer.id, newLayer);
        }
        this.map.addLayer(newLayer, before);
        this.afterLayersChanged(newLayer.id);
    };

    this.removeLayer = function(id, callAfterLayersChanged = true) {
        this.layers_.delete(id);
        this.map.removeLayer(id);
        if (callAfterLayersChanged) {
            this.afterLayersChanged(id);
        }
    };

    this.getInsarLayers = function() {
        var pointLayers = [];

        if (currentArea) {
            for (var i = 1; i <= currentArea.properties.num_chunks; i++) {
                pointLayers.push("chunk_" + i);
            }

            return pointLayers;
        }
        return null;
    };

    this.hideInsarLayers = function() {
        var insarLayers = this.getInsarLayers();
        insarLayers.forEach(function(layerID) {
            this.map.setLayoutProperty(layerID, "visibility", "none");
        }.bind(this));
    };

    this.showInsarLayers = function() {
        var insarLayers = this.getInsarLayers();
        insarLayers.forEach(function(layerID) {
            this.map.setLayoutProperty(layerID, "visibility", "visible");
        }.bind(this));
    };

    this.insarLayersHidden = function() {
        var insarLayers = this.getInsarLayers();
        var allHidden = true;

        insarLayers.forEach(function(layerID) {
            if (this.map.getLayoutProperty(layerID, "visibility") === "visible") {
                allHidden = false;
            }
        }.bind(this));

        return allHidden;
    };

    this.getTopMostSeismicitySource = function() {
        var allSources = Array.from(this.sources);

        for (var i = allSources.length - 1; i >= 0; i--) {
            var source = allSources[i][0];
            if (this.thirdPartySourcesController.seismicities.includes(source)) {
                return source;
            }
        }

        // otherwise
        return null;
    };

    this.getCurrentMode = function() {
        var allSources = Array.from(this.sources);

        for (var i = allSources.length - 1; i >= 0; i--) {
            var source = allSources[i][0];
            if (this.thirdPartySourcesController.seismicities.includes(source)) {
                return "seismicity";
            }

            if (this.thirdPartySourcesController.gps.includes(source)) {
                return "gps";
            }

            if (source === "insar_vector_source") {
                return "insar";
            }
        }

        // otherwise
        return null;
    };

    this.getLayerIDsInCurrentMode = function() {
        var mode = this.getCurrentMode();

        if (mode === "seismicity") {
            var activeLayers = [];
            this.thirdPartySourcesController.seismicities.forEach(function(layerID) {
                if (this.map.getLayer(layerID)) {
                    activeLayers.push(layerID);
                }
            }.bind(this));
            return activeLayers;
        }

        if (mode === "gps") {
            var activeLayers = [];
            this.thirdPartySourcesController.gps.forEach(function(layerID) {
                if (this.map.getLayer(layerID)) {
                    activeLayers.push(layerID);
                }
            }.bind(this));
            return activeLayers;
        }

        if (mode === "insar") {
            return this.getInsarLayers();
        }

        // otherwise
        return null;
    };

    this.disableInteractivity = function() {
        this.map.dragPan.disable();
        this.map.scrollZoom.disable();
        this.map.doubleClickZoom.disable();
    };

    this.enableInteractivity = function() {
        this.map.dragPan.enable();
        this.map.scrollZoom.enable();
        this.map.doubleClickZoom.enable();
    };

    // an alternative: http://wiki.openstreetmap.org/wiki/Zoom_levels
    // don't know if formula applies to gl js projection, though
    this.calculateDegreesPerPixelAtCurrentZoom = function() {
        var deltaPixels = 100.0;
        var point1Projected = { x: 0.0, y: 0.0 };
        var point2Projected = { x: 0.0, y: deltaPixels };

        var point1UnProjected = this.map.unproject(point1Projected);
        var point2UnProjected = this.map.unproject(point2Projected);

        // we only care about delta degrees in y direction. if innacurate,
        // take x direction into account
        // we do 1 - 2 because y axis, and thus unprojected points, is reversed
        var deltaDegrees = point1UnProjected.lat - point2UnProjected.lat;

        return deltaDegrees / deltaPixels;
    };

    this.clickOnAPoint = function(e, selectingReferencePoint) {
        var features = null;

        if (e) {
            features = this.map.queryRenderedFeatures(e.point);
        } else  {
            features = this.map.queryRenderedFeatures();
        }

        if (!features.length) {
            return;
        }

        var feature = features[0];

        if (feature.properties.p) {
            var lngLat = this.map.unproject(e.point);
            if (selectingReferencePoint) {
                appendOrReplaceUrlVar(/&refPointLat=-?\d*\.?\d*/, "&refPointLat=" + lngLat.lat.toFixed(5));
                appendOrReplaceUrlVar(/&refPointLon=-?\d*\.?\d*/, "&refPointLon=" + lngLat.lng.toFixed(5));
            } else {
                appendOrReplaceUrlVar(/&pointLat=-?\d*\.?\d*/, "&pointLat=" + lngLat.lat.toFixed(5));
                appendOrReplaceUrlVar(/&pointLon=-?\d*\.?\d*/, "&pointLon=" + lngLat.lng.toFixed(5));
            }
        }
        var id = feature.layer.id;

        if (id === "gpsStations" || id === "midas") {
            var coordinates = feature.geometry.coordinates;
            this.gpsStationPopup.remove();
            this.gpsStationPopup.setLngLat(coordinates)
                .setHTML(feature.properties.popupHTML)
                .addTo(this.map);

            return;
        }

        if (this.getCurrentMode() === "gps" && id === "midas-arrows") {
            this.thirdPartySourcesController.handleClickOnArrowFeature(feature);
        }

        // clicked on area marker, reload a new area.
        var markerSymbol = feature.properties["marker-symbol"];
        if (markerSymbol == "marker" || markerSymbol == "fillPolygon") {
            this.removePoints();

            this.removeTouchLocationMarkers();
            this.clickOnAnAreaMarker(e);
            return;
        }

        var long, lat = -1;
        if (feature.geometry.type == "Point") {
            long = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
        } else if (feature._geometry.type == "Polygon") {
            long = feature.geometry.coordinates[0][0][0];
            lat = feature.geometry.coordinates[0][0][1];
        }
        var pointNumber = feature.properties.p;

        currentPoint = pointNumber;

        if (pointNumber === undefined || pointNumber === null || feature.layer.id == "contours" || feature.layer.id == "contour_label") {
            return;
        }

        var areaName = currentArea.properties.unavco_name;

        // show link to current clicked point in webservices
        var html = "<a target='_blank' href='" + getRootUrl() + "WebServices?dataset=" + areaName + "&point=" + pointNumber + "'>View JSON for current clicked point</a>";
        $("#current-point-webservices-link").html(html);

        var query = {
            "area": areaName,
            "pointNumber": pointNumber
        };

        if (!selectingReferencePoint) {
            var chartContainer = "chartContainer";
            var clickMarker = this.clickLocationMarker;
            var markerSymbol = "cross";

            if (this.graphsController.selectedGraph == "Bottom Graph") {
                chartContainer = "chartContainer2";
                clickMarker = this.clickLocationMarker2;
                markerSymbol += "Red";
            }

            var layerID = this.graphsController.selectedGraph;

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
            if (this.map.getLayer(layerID)) {
                this.removeSourceAndLayer(layerID);
            }

            this.addSource(layerID, clickMarker);
            var before = this.getLayerOnTopOf(layerID);
            this.addLayer({
                "id": layerID,
                "type": "symbol",
                "source": layerID,
                "layout": {
                    "icon-image": "{marker-symbol}-15",
                }
            }, before);

            var pointDetailsHtml = lat.toFixed(3) + ", " + long.toFixed(3);

            $("#point-details > .row > #clicked-point-lat-lng").html(pointDetailsHtml);

            $("#search-form-and-results-minimize-button").click();
            $("#graph-div-minimize-button").css("display", "block");
            $("#graph-div-maximize-button").css("display", "none");

        }
        // load displacements from server, and then show on graph
        loadJSONFunc(query, "/point", function(response) {
            var json = JSON.parse(response);
            if (selectingReferencePoint) {
                this.referenceDisplacements = json.displacements;
                this.addReferencePointFromClick(lat, long, this.referenceDisplacements);
                // in case DB reference point is showing
                if (this.map.getSource("DBReferencePoint")) {
                    this.removeSourceAndLayer("DBReferencePoint");
                }
                referencePointToggleButton.set("on", true);
                $("#select-reference-point-toggle-button").css("opacity", 1.0);
                return;
            }

            if (this.map.getSource("ReferencePoint") != null) {
                json.displacements = json.displacements.map(function(displacement, idx) {
                    return displacement - this.referenceDisplacements[idx];
                }.bind(this));
            }

            // only draw graph after window finishes maximize animation
            var animationEvents = "webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend";
            var onAnimationEnd = function(event) {
                if (!this.pointsLoaded()) {
                    return;
                }
                // dont resize charts if animation event triggered but we are displaying insar mini slider...
                // TODO: this animation stuff really needs to be refactored, it is frightening currently and very hackish
                if (!$("#charts").hasClass("only-show-slider")) {
                    this.graphsController.resizeChartContainers();
                }
                // make sure the chart exists and hasn't been deleted. we need this cause what if this event
                // never fires, but we click on a new dataset, and this causes the div which contains all sliders
                // to change size/animate? we could just remove this event when we select a new dataset, but I don't feel
                // like copying animation events and removal code etc again... i also dont feel like making animationevents
                // nor the callback global variables when a simple if will fix the issues/exceptions...
                if (this.graphsController.chartExists(chartContainer)) {
                    this.graphsController.JSONToGraph(currentArea, json, chartContainer, e);
                }
                $("#charts").off(animationEvents, null, onAnimationEnd);
            }.bind(this);
            $("#charts").one(animationEvents, onAnimationEnd);
            // why isn't graphsController handling these showing of the graph divs
            // TODO: refactor
            $("#graph-div-maximize-button").click();
            var height = "70%";
            if (window.matchMedia("(max-width: 590px)").matches) {
                height = "100%";
            }
            $("#charts").removeClass("only-show-slider").height(height);
            $hideWhenOnlyShowSliders = $("#hide-when-only-show-sliders").css("display", "block");
            if (this.thirdPartySourcesController.seismicityLoaded()) {
                $hideWhenOnlyShowSliders.addClass("show-seismicity-sliders");
                $("#map-options").addClass("show-seismicity-sliders");
            } else {
                $hideWhenOnlyShowSliders.removeClass("show-seismicity-sliders");
                $("#map-options").removeClass("show-seismicity-sliders");
            }

            // if graph isn't animating, we still want to draw chart. this means if it is animating,
            // it will draw twice, but logic to prevent this would have made code messy for a premature
            // optimization...
            this.graphsController.JSONToGraph(currentArea, json, chartContainer, e);

            // request elevation of point from google api
            var elevationGetter = new google.maps.ElevationService;
            elevationGetter.getElevationForLocations({
                "locations": [{ lat: lat, lng: long }]
            }, function(results, status) {
                if (status === google.maps.ElevationStatus.OK) {
                    // redundant but to avoid race conditions between two successive clicks
                    $("#point-details > .row > #clicked-point-lat-lng").html(pointDetailsHtml);
                    $("#point-details > .row > #clicked-point-lat-lng").append("<br>Elevation: " + results[0].elevation.toFixed(0) + " meters");
                } else {
                    console.log(status);
                }
            });
        }.bind(this));
    };

    this.determineZoomOutZoom = function() {
        // memorize the zoom we clicked at, but only if it's more zoomed out than
        // the flyTo zoom when an area is loaded
        var currentZoom = this.map.getZoom();
        if (currentZoom <= 7.0) {
            // prevent zoom below 0.5, as floating point inaccuracies can cause bugs at most zoomed out level
            if (currentZoom <= 0.5) {
                this.zoomOutZoom = 0.5;
            } else {
                this.zoomOutZoom = this.map.getZoom();
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

    this.leftClickOnAPoint = function(e, selectingReferencePoint) {
        this.clickOnAPoint(e, selectingReferencePoint);
    };

    this.rightClickOnAPoint = function(e) {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            this.clickOnAPoint(e);
        }
    };

    this.pointClicked = function() {
        return this.map.getLayer("Top Graph") !== undefined || this.map.getLayer("Bottom Graph") !== undefined;
    };

    this.getSubsetFeatures = function(feature) {
        var subsetFeatures = this.areaMarkerLayer.mapAreaIDsWithFeatureObjects[this.getAreaID(feature)];

        return subsetFeatures;
    };

    this.getAreaID = function(area) {
        var attributesController = new AreaAttributesController(this, area);
        var attributes = attributesController.getAllAttributes();

        var areaID = attributes.mission + attributes.relative_orbit + attributes.flight_direction + (attributes.first_frame ? attributes.first_frame : attributes.frame);

        return areaID;
    };

    this.addSubsetSwaths = function(feature, populateSearchTable) {
        var subsetFeatures = this.getSubsetFeatures(feature);

        if (subsetFeatures) {
            subsetFeatures = subsetFeatures.slice(0); // clone it to prevent infinite loop when we add to the hashmap
            var minMax = findMinMaxOfArray(subsetFeatures, function(feature1, feature2) {
                var unavcoNameFields1 = feature1.properties.unavco_name.split("_").length;
                var unavcoNameFields2 = feature2.properties.unavco_name.split("_").length;

                return unavcoNameFields1 - unavcoNameFields2;
            });
            var minNumFields = minMax.min.properties.unavco_name.split("_").length;
            subsetFeatures.forEach(function(feature) {
                // ignore smallest, or "master", non-subset feature(s). these features will use their regular
                // scene_footprint to be added to the map. the others will use their data_footprint. we put
                // data_footprint of non-master features into scene_footprint since addSwathsFromJSON reads
                // the scene_footprint.
                if (feature.properties.unavco_name.split("_").length != minNumFields) {
                    var dataFootprint = feature.properties.extra_attributes.data_footprint;
                    feature.properties.extra_attributes.scene_footprint = dataFootprint;
                }

            });
            var json = {
                "areas": subsetFeatures
            };
            this.addSwathsFromJSON(json, null, populateSearchTable, true);
        }
    };

    this.getPermissibleMinMax = function(min, max) {
        var absMax = Math.abs(max);
        var absMin = Math.abs(min);
        var limit = absMax > absMin ? absMax : absMin;
        var permissibleValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2, 3, 4, 5,
                                 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150,
                                 200, 300, 400, 500, 600, 700, 800, 900, 1000];
        var permissibleValueIndex = binarySearch(permissibleValues, limit, function(val1, val2) {
            return val2 - val1;
        });

        if (permissibleValueIndex.found) {
            return permissibleValues[permissibleValueIndex.index];
        }

        // not found
        var idx = permissibleValueIndex.index;
        if (idx == 0) {
           // only compare this index and one to the right
           var diffCur = Math.abs(limit - permissibleValues[idx]);
           var diffRight = Math.abs(limit - permissibleValues[idx + 1]);

           return diffCur < diffRight ? permissibleValues[idx] : permissibleValues[idx + 1];
        }

        if (idx == permissibleValues.length) {
            // last idx
            return permissibleValues[idx - 1];
        }

        if (idx == permissibleValues.length - 1) {
           // only compare this index (it's last one) and one to the left
           var diffCur = Math.abs(limit - permissibleValues[idx]);
           var diffLeft = Math.abs(limit - permissibleValues[idx - 1]);

           return diffCur < diffLeft ? permissibleValues[idx] : permissibleValues[idx - 1];
        }

        // otherwise, compare values to the left and to the right and choose closest one
        var diffCur = Math.abs(limit - permissibleValues[idx]);
        var diffRight = Math.abs(limit - permissibleValues[idx + 1]);
        var diffLeft = Math.abs(limit - permissibleValues[idx - 1]);
        var closest =  diffCur < diffRight ? { diff: diffCur, val: permissibleValues[idx] } : { diff: diffRight, val: permissibleValues[idx + 1] };

        return closest.diff < diffLeft ? closest.val : permissibleValues[idx - 1];
    };

    this.loadDatasetFromFeature = function(feature, initialZoom) {
        var attributesController = new AreaAttributesController(this, feature);
        var minScale = null;
        var maxScale = null;
        if (urlOptions) {
            minScale = parseFloat(urlOptions.startingDatasetOptions.minScale);
            maxScale = parseFloat(urlOptions.startingDatasetOptions.maxScale);

            // if we have min and max in url, use those
            if (minScale && maxScale) {
                delete urlOptions.startingDatasetOptions.minScale;
                delete urlOptions.startingDatasetOptions.maxScale;
                var negLimit = minScale;
                var posLimit = maxScale;
                this.doNowOrOnceRendered(function() {
                    this.colorScale.setMinMax(posLimit, negLimit, true);
                }.bind(this));
            }
            var colorscale = urlOptions.startingDatasetOptions.colorscale;
            if (colorscale) {
                var dates = this.selector.getCurrentStartEndDateFromArea(feature);
                // don't need to delete urlOptions start and end Date. they are deleted in chart
                // load event after properly set
                var startDate = null;
                var endDate = null;
                var minDate = urlOptions.startingDatasetOptions.startDate;
                if (minDate) {
                    startDate = yyyymmddToDate(minDate);
                } else {
                    startDate = dates.startDate;
                }
                var maxDate = urlOptions.startingDatasetOptions.endDate;
                if (maxDate) {
                    endDate = yyyymmddToDate(maxDate);
                } else {
                    endDate = dates.endDate;
                }
                var colorscale = urlOptions.startingDatasetOptions.colorscale;

                this.doNowOrOnceRendered(function() {
                    if (colorscale === "velocity") {
                        this.colorDatasetOnVelocity(startDate, endDate);
                    } else if (colorscale == "displacement") {
                        this.colorDatasetOnDisplacement(startDate, endDate);
                    }
                    delete urlOptions.startingDatasetOptions.colorscale;
                }.bind(this));
            }
        }
        $.ajax({
            url: "/preLoad",
            type: "post",
            async: true,
            data: {
                datasetUnavcoName: attributesController.getAttribute("unavco_name"),
            },
            success: function(response) {
                // if we have min and max in url, use those, so don't calculate these color scale values
                if (!(minScale && maxScale)) {
                    // * 100.0 to convert from m to cm
                    var min = parseFloat(response[0].m) * 100.0;
                    var max = parseFloat(response[1].m) * 100.0;
                    var absMax = Math.abs(max);
                    var absMin = Math.abs(min);
                    var limit = absMax > absMin ? absMax : absMin;
                    // he said take 50% of limit
                    limit *= 0.5;
                    var limit = this.getPermissibleMinMax(-limit, limit);
                    var posLimit = limit;
                    var negLimit = -limit;

                    this.doNowOrOnceRendered(function() {
                        this.colorScale.setMinMax(posLimit, negLimit, true);
                    }.bind(this));
                }
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed: " + xhr.responseText);
            }
        });
        var tileJSON = {
            "minzoom": 0,
            "maxzoom": 14,
            "center": [130.308838,
                32.091882, 14
            ],
            "bounds": null,
            "tiles": [
                "https://insarmaps.miami.edu:8888/" + feature.properties.unavco_name +
                "/{z}/{x}/{y}.pbf"
            ],
            "vector_layers": []
        };

        if (this.pointsLoaded()) {
            this.removePoints();
            this.removeTouchLocationMarkers();
        }

        currentArea = feature;

        for (var i = 1; i <= feature.properties.num_chunks; i++) {
            var layer = { "id": "chunk_" + i, "description": "", "minzoom": 0, "maxzoom": 14, "fields": { "c": "Number", "m": "Number", "p": "Number" } };
            tileJSON.vector_layers.push(layer);
        }

        areaAttributesPopup.show(feature);

        this.colorScale.show();
        $("#search-form-and-results-minimize-button").click();

        // when we click, we don't reset the highlight of modified markers one final time
        this.areaMarkerLayer.resetHighlightsOfAllMarkers();
        // get a recolor selector
        var button = $("#square-selector-button");
        button.attr("data-original-title", "Select Points");
        this.selector.disableSelectMode(); // in case it is selected
        this.selector.removeEventListeners(); // remove old event listeners
        this.selector = new FeatureSelector();
        this.selector.map = this;
        this.selector.associatedButton = button;
        this.selector.prepareEventListeners(); // and add new ones

        this.colorScale.defaultValues(); // set default values in case they were modified by another area
        this.selector.reset(currentArea);
        this.colorScale.setTitle("LOS Velocity<br>[cm/yr]");

        this.addDataset(tileJSON, feature);
        this.graphsController.destroyGraphs();
        $("#charts").addClass("only-show-slider").addClass("active");
        $("#hide-when-only-show-sliders").css("display", "none");
        this.graphsController.createInsarSliderForDataset(currentArea);
        if (initialZoom) {
            this.zoomOutZoom = initialZoom - 4;
        }

        this.map.once("data", function(event) {
            this.removeAreaMarkersThroughButton();

            // in case it's up
            this.gpsStationPopup.remove();
            this.onceRendered(function() {
                var zoom = this.datasetZoom;

                // quickly switching between areas? don't reset zoom
                if (this.anAreaWasPreviouslyLoaded()) {
                    zoom = this.map.getZoom();
                }

                if (initialZoom) {
                    zoom = initialZoom;
                }
                // set our tilejson to the one we've loaded. this will make sure anAreaWasPreviouslyLoaded method returns true after the
                // first time a dataset is selected
                this.tileJSON = tileJSON;

                var centerOfDataset = feature.geometry.coordinates;

                // don't fly to center of dataset if this option is false in the url... this allows
                // user to control whether to use their specified starting coordinates after loading a dataset
                // to focus on a volcano for example
                if (!(urlOptions && urlOptions.startingDatasetOptions.flyToDatasetCenter === "false")) {
                    this.map.flyTo({
                        center: centerOfDataset,
                        zoom: zoom
                    });
                }

                attributesController.processAttributes();
                this.areaMarkerLayer.setAreaRowHighlighted(feature.properties.unavco_name);
                if (urlOptions) {
                    var pointLat = urlOptions.startingDatasetOptions.pointLat;
                    var pointLon = urlOptions.startingDatasetOptions.pointLon;
                    if (pointLat && pointLon) {
                        delete urlOptions.startingDatasetOptions.pointLat;
                        delete urlOptions.startingDatasetOptions.pointLon;
                        var point = this.map.project([pointLon, pointLat]);
                        this.leftClickOnAPoint({ point: point }, false);
                    }
                    var refPointLat = urlOptions.startingDatasetOptions.refPointLat;
                    var refPointLon = urlOptions.startingDatasetOptions.refPointLon;
                    if (refPointLat && refPointLon) {
                        delete urlOptions.startingDatasetOptions.refPointLat;
                        delete urlOptions.startingDatasetOptions.refPointLon;
                        var point = this.map.project([refPointLon, refPointLat]);
                        this.leftClickOnAPoint({ point: point }, true);
                        referencePointToggleButton.set("on", false);
                    }
                }
                updateUrlState(this);
                // in case someone called loading screen
                hideLoadingScreen();
            }.bind(this));
        }.bind(this));

        if (!localStorage.getItem("colorScaleTip")) {
            alert("Click on colorscale to adjust scale.");
            // try catch cause if can't set item due to private browsing, don't just crash the whole page
            try {
                localStorage.setItem("colorScaleTip", "true");
            } catch (e) {}
        }
        document.getElementsByTagName("title")[0].innerHTML = "Insar Viewer - University of Miami "
                                        + attributesController.getAttribute("unavco_name");
        };

    this.clickOnAnAreaMarker = function(e) {
        var features = this.map.queryRenderedFeatures(e.point);

        if (!features.length) {
            return;
        }

        var layerID = "touchLocation";

        var frameFeature = this.getFirstPolygonFrameAtPoint(features);
        if (frameFeature) {
            var subsetFeatures = this.getSubsetFeatures(frameFeature);

            // if dataset has child features then it must have more than 1 according to Yunjun, otherwise, the child
            // isn't really a child
            var haveSubsets = subsetFeatures && subsetFeatures.length > 1;
            if (haveSubsets) {
                this.removeAreaMarkers();
                this.addSubsetSwaths(frameFeature, false);
            } else {
                this.determineZoomOutZoom();

                var feature = frameFeature;
                // set coordinates to center of dataset
                feature.geometry.coordinates = JSON.parse(feature.properties.centerOfDataset);
                this.loadDatasetFromFeature(feature);
            }
        }
    };

    this.getMapBaseStyle = function(tileset) {
        var layers = [{
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        }];

        // simplest solution to mapbox.streets being deprecated - use static tiles API for mapbox streets
        // otherwise, many things break because we base alot of logic on the base map being raster
        var rasterTileSource = {
                "type": "raster",
                "url": "mapbox://" + tileset,
                "tileSize": 256
        };
        if (tileset === "mapbox.streets") {
            rasterTileSource = {
                "type": "raster",
                "tiles": [
                    "https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=" + mapboxgl.accessToken
                ],
                "tileSize": 256
            };
        }

        var style = {
            version: 8,
            sprite: getRootUrl() + "maki/makiIcons",
            glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
            sources: {
                "raster-tiles": rasterTileSource,
                'Mapbox Terrain V2': {
                    type: 'vector',
                    url: 'mapbox://mapbox.mapbox-terrain-v2'
                }
            },
            layers: layers
        };

        return { style: style, layers: layers };
    };

    this.setBaseMapLayer = function(mapType) {
        var tileset = 'mapbox.' + mapType;
        var styleAndLayer = this.getMapBaseStyle(tileset);
        styleAndLayer.layers.forEach(function(layer) {
            this.layers_.set(layer.id, layer);
        }.bind(this));

        var baseStyle = styleAndLayer.style;
        var sources = styleAndLayer.style.sources;
        for (var sourceID in sources) {
            if (sources.hasOwnProperty(sourceID)) {
                this.sources.set(sourceID, sources[sourceID]);
            }
        }

        this.sources.forEach(function(source, sourceID) {
            baseStyle.sources[sourceID] = source;
        });

        // remove when functionality made available to third parties
        if (mapType === "google-satellite") {
            delete sources["raster-tiles"]["url"];
            sources["raster-tiles"]["tiles"] = [
                "https://mt.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            ];
        }

        baseStyle.layers = [];
        this.layers_.forEach(function(layer, layerID) {
            baseStyle.layers.push(layer);
        });

        this.map.setStyle(styleAndLayer.style);
    };

    this.getActualSizeGeoJSON = function(features) {
        var pointLayers = this.getInsarLayers();
        if (!features) {
            // if ontheflyjson is enabled, insar layers are not rendered
            if (this.map.getLayer("onTheFlyJSON")) {
                features = this.map.queryRenderedFeatures({ layers: ["onTheFlyJSON"] });
            } else {
                features = this.map.queryRenderedFeatures({ layers: pointLayers });
            }
        }
        var attributesController = new AreaAttributesController(this, currentArea);
        var x_step = parseFloat(attributesController.getAttribute("X_STEP"));
        var y_step = parseFloat(attributesController.getAttribute("Y_STEP"));

        var geoJSONData = {
            "type": "FeatureCollection",
            "features": []
        };

        features.forEach(function(feature) {
            var long = feature.geometry.coordinates[0];
            var lat = feature.geometry.coordinates[1];
            geoJSONData.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [long, lat], [long + x_step, lat], [long + x_step, lat + y_step],
                            [long, lat + y_step], [long, lat]
                        ]
                    ]
                },
                "properties": {
                    "m": feature.properties.m,
                    "p": feature.properties.p
                }
            });
        });

        return geoJSONData;
    };

    this.updateActualSizePixels = function() {
        this.map.getSource("onTheFlyJSON").setData(this.getActualSizeGeoJSON());
    };

    this.setInsarActualPixelSize = function(area, stops) {
        this.insarActualPixelSize = true;
        this.selector.recolorDataset();
    };

    this.setInsarDefaultPixelSize = function(area) {
        this.insarActualPixelSize = false;
        if (this.map.getSource("onTheFlyJSON")) {
            if (this.datasetCurrentlyRecolored) {
                this.selector.recolorDataset();
            } else {
                this.removeSourceAndLayer("onTheFlyJSON");
                this.showInsarLayers();
            }
        }
    };

    this.addReferencePointSourceAndLayer = function(id, lat, lon) {
        var referencePointSource = {
            type: "geojson",
            cluster: false,
            data: {
                "type": "FeatureCollection",
                "features": [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                }]
            }
        };
        var source = this.map.getSource(id);
        if (source) {
            source.setData(referencePointSource.data);
        } else {
            var before = this.getLayerOnTopOf(id);
            var stops = this.radiusStops.map(function(x) { return [x[0], x[1] * 0.5] } );

            this.addSource(id, referencePointSource);
            this.addLayer({
                "id": id,
                "type": "circle",
                "source": id,
                "paint": {
                    "circle-color": "black",
                    "circle-radius": {
                        stops: stops
                    }
                }
            }, before);
        }
    };


    this.addReferencePointFromClick = function(lat, lon, displacement_array) {
        this.addReferencePointSourceAndLayer("ReferencePoint", lat, lon);
        this.selector.refreshDatasetWithNewReferencePoint(displacement_array);
        // graphsController works in CM, not M
        var refDisplacementsCM = displacement_array.map(function(displacement) {
            return 100 * displacement;
        });
        this.graphsController.removeReferenceValuesFromDisplacements(refDisplacementsCM);
        this.graphsController.recreateGraphs();
    };

    this.doneSelectingReferencePoint = function() {
        this.selectingReferencePoint = false;
    };

    this.addReferencePointFromArea = function(area) {
        var attributesController = new AreaAttributesController(this, area);
        var oldRefLon = attributesController.getAttribute("ref_lon");
        var newRefLon = attributesController.getAttribute("REF_LON");
        var oldRefLat = attributesController.getAttribute("ref_lat");
        var newRefLat = attributesController.getAttribute("REF_LAT");
        if ((oldRefLon && oldRefLat) || (newRefLon && newRefLat)) {
            var refLon = null;
            var refLat = null;
            if (oldRefLon && oldRefLat) {
                refLon = oldRefLon;
                refLat = oldRefLat;
            } else {
                refLon = newRefLon;
                refLat = newRefLat;
            }

            this.addReferencePointSourceAndLayer("DBReferencePoint", refLat, refLon);
        }
    };

    this.displayReferencePoint = function() {
        var customReferencePointSource = this.map.getSource("ReferencePoint");
        if (customReferencePointSource == null) {
            this.addReferencePointFromArea(currentArea);
        } else {
            this.map.setLayoutProperty("ReferencePoint", "visibility", "visible");
        }
    };

    this.hideReferencePoint = function() {
        if (this.map.getSource("DBReferencePoint")) {
            this.removeSourceAndLayer("DBReferencePoint");
        } else if (this.map.getSource("ReferencePoint")) {
            this.map.setLayoutProperty("ReferencePoint", "visibility", "none");
        }
    };

    this.removeReferencePoint = function() {
        if (this.map.getSource("ReferencePoint")) {
            this.removeSourceAndLayer("ReferencePoint");
            this.selector.recolorDataset();
            // graphsController works in CM, not M
            var refDisplacementsCM = this.referenceDisplacements.map(function(displacement) {
                return 100 * displacement;
            });
            this.graphsController.addReferenceValuesToDisplacements(refDisplacementsCM);
            this.graphsController.recreateGraphs();
            removeURLVar(/&refPointLat=-?\d*\.?\d*/);
            removeURLVar(/&refPointLon=-?\d*\.?\d*/);
        }
    };

    this.highResMode = function() {
        var attributesController = new AreaAttributesController(this, currentArea);
        var x_step = parseFloat(attributesController.getAttribute("X_STEP"));
        var y_step = parseFloat(attributesController.getAttribute("Y_STEP"));

        return isNaN(x_step) || isNaN(y_step);
    };

    // extremas: current min = -0.02 (blue), current max = 0.02 (red)
    this.addDataset = function(data, feature) {
        this.colorScale.setTopAsMax(true);
        var colorOn = getUrlVar("colorscale");
        this.colorOnDisplacement = false;
        if (colorOn && colorOn === "displacement") {
            this.colorOnDisplacement = true;
        }
        var colorStops = this.colorScale.getMapboxStops();

        this.addSource('insar_vector_source', {
            type: 'vector',
            tiles: data['tiles'],
            minzoom: data['minzoom'],
            maxzoom: data['maxzoom'],
            // TODO: implement, but not really needed as mapbox (in newer releases) doesnt throw exceptions
            // when map viewport is outside available mbtiles coverage
            // bounds: data['bounds']
        });

        var before = this.getLayerOnTopOf("chunk_1");
        var stops = this.radiusStops;
        if (this.highResMode()) {
            // TODO: calculate so radius corersponds to approximately 5 meters
            stops = this.highResRadiusStops;
        }
        data['vector_layers'].forEach(function(el) {
            var layer = {
                id: el['id'],
                source: 'insar_vector_source',
                'source-layer': el['id'],
                type: 'circle',
                layout: {
                    'visibility': 'visible'
                },
                paint: {
                    'circle-color': {
                        property: 'm',
                        stops: colorStops
                    },
                    'circle-radius': {
                        // for an explanation of this array see here:
                        // https://www.mapbox.com/blog/data-driven-styling/
                        stops: stops
                    }
                }
            }
            // set USGS events form start and end dates to that of the current insar dates
            var attributesController = new AreaAttributesController(this, feature);
            var firstDate = new Date(attributesController.getAttribute("first_date"));
            var lastDate = new Date(attributesController.getAttribute("last_date"));
            var now = new Date();

            var dateDiffFromNow = now - lastDate;
            var yearsElapsed = dateDiffFromNow / MILLISECONDS_PER_YEAR;
            if (yearsElapsed < 1.0) {
                lastDate = now;
            }
            var centerLineUTC = attributesController.getAttribute("CENTER_LINE_UTC");
            if (centerLineUTC) {
                this.thirdPartySourcesController.USGSEventsOptionsController.UTCTime = centerLineUTC;
            } else {
                this.thirdPartySourcesController.USGSEventsOptionsController.UTCTime = "0";
            }
            this.thirdPartySourcesController.USGSEventsOptionsController.populateDateInputsFromDates(firstDate, lastDate);

            this.addLayer(layer, before);
        }.bind(this));

        if (referencePointToggleButton.toggleState == ToggleStates.ON) {
            this.addReferencePointFromArea(feature);
        }
        $("#charts").height("auto");
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

    this.addSwathsFromJSON = function(json, toExclude, populateSearchTable, addAllSubsets) {
        var features = [];

        var attributesController = new AreaAttributesController(this, json.areas[0]);
        var searchFormController = new SearchFormController();

        this.areaMarkerLayer.emptyLayers();
        // clear the map so we can add new keys and values to it
        this.areaMarkerLayer.mapAreaIDsWithFeatureObjects = {};

        for (var i = 0; i < json.areas.length; i++) {
            var area = json.areas[i];

            var lat = area.geometry.coordinates[1];
            var long = area.geometry.coordinates[0];

            attributesController.setArea(area);
            var attributes = attributesController.getAllAttributes();

            var footprint = attributesController.getAttribute("scene_footprint");
            if (attributesController.areaHasAttribute("mintpy.subset.lalo")) {
                // needed as high res datasets have mintpy.subset.lalo but no data_footprint
                // TODO: FIX
                var dataFootprint = attributesController.getAttribute("data_footprint");
                if (dataFootprint) {
                    footprint = dataFootprint;
                }
            }
            var polygonGeoJSON = Terraformer.WKT.parse(footprint);
            var lineStringGeoJSON = this.polygonToLineString(polygonGeoJSON);

            var properties = area.properties;

            var id = "swath-area-" + properties.unavco_name;
            var polygonID = "swath-area-" + properties.unavco_name + "fill"
            var center = area.properties.centerOfDataset ?
                area.properties.centerOfDataset : area.geometry.coordinates;

            var feature = {
                "type": "Feature",
                "geometry": polygonGeoJSON,
                "properties": {
                    "marker-symbol": "marker",
                    "layerID": id,
                    "centerOfDataset": center,
                    "unavco_name": properties.unavco_name,
                    "region": properties.region,
                    "project_name": properties.project_name,
                    "num_chunks": properties.num_chunks,
                    "country": properties.country,
                    "decimal_dates": properties.decimal_dates,
                    "string_dates": properties.string_dates,
                    "attributekeys": properties.attributekeys,
                    "attributevalues": properties.attributevalues,
                    "extra_attributes": properties.extra_attributes,
                    "plot_attributes": properties.plot_attributes
                }
            };

            var siblingAlreadyThere = false;
            var areaID = this.getAreaID(area);

            if (attributesController.areaHasAttribute("data_footprint")) {
                var data_footprint = attributesController.getAttribute("data_footprint");
                // make the scene footprint the previous data_footprint and delete the data_footprint
                var areaClone = JSON.parse(JSON.stringify(area));

                // we are adding the subsets, there is no need to know anymore whether a feature has subsets
                // so the map will be empty (since we empty on entering this method). not having this if causes us
                // to never be able click on a subset and load an area with the new way we determine subsets.
                // there were other alternatives such as checking if a feature has subsets AND the current feature
                // in question is the "master" subset swath but this was a quicker solution.
                if (!addAllSubsets) {
                    if (!this.areaMarkerLayer.mapAreaIDsWithFeatureObjects[areaID]) {
                        this.areaMarkerLayer.mapAreaIDsWithFeatureObjects[areaID] = [areaClone];
                    } else {
                        siblingAlreadyThere = true;
                        this.areaMarkerLayer.mapAreaIDsWithFeatureObjects[areaID].push(areaClone);
                    }
                }
            }

            if (!siblingAlreadyThere || addAllSubsets) {
                features.push(area);

                var swathWidth = 3;
                var swath = new Swath(this, attributes.mission, swathWidth, feature, id);
                this.areaMarkerLayer.addSwath(swath);
                // exclude this area from showing on the map, but we still want to add it
                // to our areaFeatures array so we can highlight the current area
                if (!toExclude || !toExclude.includes(area.properties.unavco_name)) {
                    swath.display();
                }
            }
        }

        if (populateSearchTable) {
            searchFormController.populateSearchResultsTable(features);
        }

        // update current map areas
        this.areas = features;
        populateSearchAutocomplete();

        return features;
    };

    this.loadAreaMarkersExcluding = function(toExclude, after) {
        if (this.lastAreasRequest) {
            this.lastAreasRequest.abort();
            this.lastAreasRequest = null;
        }

        this.lastAreasRequest = $.ajax({
            url: "/areas",
            success: function(response) {
                var json = response;
                if (!this.allAreas) {
                    this.allAreas = json.areas;
                }

                var features = this.addSwathsFromJSON(json, toExclude, true, false);

                if (after) {
                    after(features);
                }
                this.lastAreasRequest = null;
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
            }
        });
    };

    this.loadAreaMarkers = function(after) {
        this.loadAreaMarkersExcluding(null, after);
    };

    // TODO: might want to rename this since they are now swaths...
    this.removeAreaMarkers = function() {
        // avoid race condition if there is an ajax request currently in progress and we are on a SLOW internet
        // connection
        if (this.lastAreasRequest) {
            this.lastAreasRequest.abort();
            this.lastAreasRequest = null;
        }
        this.areaMarkerLayer.emptyLayers();
    };

    this.removeAreaMarkersThroughButton = function() {
        $button = $("#dataset-frames-toggle-button");
        if (!$button.hasClass("toggled")) {
            $button.click();
        }
    };

    this.loadAreaMarkersThroughButton = function(after) {
        $button = $("#dataset-frames-toggle-button");
        if ($button.hasClass("toggled")) {
            $button.click();
        }
    };

    // until mapbox api gives us a way to determine when all points of mbtiles
    // have finished fully rendering.
    this.onRendered = function(callback) {
        var renderHandler = function() {
            if (this.map.loaded()) {
                callback(renderHandler);
            }
        }.bind(this);
        this.map.on("render", renderHandler);
    };

    // can't just call mapbox once as when it first fires, map isn't guaranteed to be loaded
    this.onceRendered = function(callback) {
        var renderHandler = function() {
            if (this.map.loaded()) {
                callback();
                this.map.off("render", renderHandler);
            }
        }.bind(this);
        this.map.on("render", renderHandler);
    };

    this.doNowOrOnceRendered = function(callback) {
        if (this.map.loaded()) {
            callback();
        } else {
            this.onceRendered(function() {
                callback();
            }.bind(this));
        }
    };

    this.loadSwathsInCurrentViewport = function(populateTable) {
        var bounds = this.map.getBounds();
        var bbox = [bounds._ne, bounds._sw];
        this.areaFilterSelector.filterAreasInBrowser(bbox, populateTable);
    };

    this.processURLOptions = function() {
        if (!urlOptions) {
            return;
        }
        var options = urlOptions.startingDatasetOptions;

        if (options.startDataset) {
            var exists = false;
            for (var i = 0; i < this.allAreas.length; i++) {
                if (this.allAreas[i].properties.unavco_name === options.startDataset) {
                    exists = true;
                    showLoadingScreen("Loading requested dataset...", null);
                    this.loadDatasetFromFeature(this.allAreas[i], urlOptions.startingView.zoom);
                    break;
                }
            }
            if (!exists) {
                window.alert(options.startDataset + " does not exist.");
            }
        } else if (options.onlyShowDatasets) {
            var datasetsToShow = options.onlyShowDatasets.split(",");
            var areasToShow = [];
            this.allAreas.forEach(function(area) {
                if (datasetsToShow.includes(area.properties.unavco_name)) {
                    areasToShow.push(area);
                }
            });
            // i suppose it's not elegant to just re-add them and we could do something
            // like tell server to only return some areas, or something else, but this is quick, and it works.
            // and to be honest, changing it, while more elegant, seems like micro optimzation since this was so quick
            // to implement.
            this.allAreas = areasToShow;
            this.areas = areasToShow
            var json = {
                "areas": areasToShow
            };
            this.addSwathsFromJSON(json, null, true, false);
        }

        if (options.loadSeismicity) {
            var sourceNames = options.loadSeismicity.split(",");
            sourceNames.forEach(function(sourceName) {
                this.thirdPartySourcesController.loadSourceFromString(sourceName);
            }.bind(this));
        }
    };

    this.updateOnTheFlyIfThere = function() {
        if (this.map.getSource("onTheFlyJSON")) {
            var pointLayers = this.getInsarLayers();
            this.onceRendered(function() {
                this.selector.recolorDataset();
                this.onceRendered(function() {
                    this.hideInsarLayers();;
                }.bind(this));
            }.bind(this));
            showLoadingScreen("Rendering at new zoom level", null);
            this.showInsarLayers();
        }
    };

    this.addMapToPage = function(containerID) {
        var startingOptions = null;
        var minZoom = 0; // default as per gl js api
        if (urlOptions) {
            startingOptions = urlOptions.startingView;
        }
        var startingCoords = this.startingCoords;
        var startingZoom = this.startingZoom;
        try {
            startingCoords = new mapboxgl.LngLat(startingOptions.lng, startingOptions.lat);
            startingZoom = parseFloat(startingOptions.zoom);
            if (urlOptions.startingDatasetOptions.startDataset) {
                // use the dataset zoom as the starting zoom if it was specified
                // but only if there's a startDataset (prevents flying to
                // a more zoomed out view and resetting the map when a zoom has been
                // specified in the url, but no startDataset)
                this.datasetZoom = startingZoom;
            }
            // prevent zoom out if specified
            if (urlOptions.startingDatasetOptions.zoomOut === "false") {
                minZoom = startingZoom;
            }
        } catch (error) {}

        this.map = new mapboxgl.Map({
            container: containerID, // container id
            center: startingCoords, // this.starting position
            zoom: startingZoom, // this.starting zoom
            minZoom: minZoom,
            attributionControl: false
        }).addControl(new mapboxgl.AttributionControl({
            compact: true
        }));

        this.map.once("load", function() {
            // populate usgs events with current viewport
            var bounds = this.map.getBounds();
            var sw = bounds._sw.lat.toFixed(2) + ", " + bounds._sw.lng.toFixed(2);
            var ne = bounds._ne.lat.toFixed(2) + ", " + bounds._ne.lng.toFixed(2);
            $("#usgs-events-current-viewport").html("sw: " + sw + ", ne: " + ne);

            this.colorScale.initVisualScale();
            this.seismicityColorScale.initVisualScale();
            this.map.getCanvas().style.cursor = 'auto';
            this.selector = new FeatureSelector();
            this.selector.map = this;
            this.selector.associatedButton = $("#square-selector-button");
            this.selector.prepareEventListeners();
            this.loadAreaMarkers(function(areas) {
                this.areas = areas;
                if (!urlOptions) {
                    return;
                }
                this.processURLOptions();
                this.loadSwathsInCurrentViewport(true);
            }.bind(this));
            this.areaFilterSelector = new AreaFilterSelector();
            this.areaFilterSelector.map = this;
        }.bind(this));

        this.setBaseMapLayer("streets");

        this.map.addControl(new mapboxgl.NavigationControl());
        var geoLocator = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
                timeout: 30000 // 30 secs
            },
            trackUserLocation: true
        });
        geoLocator.on("error", function(error) {
            var errStr = "There was an error activating the gps feature.\nHere is the error:\n\n\"" + error.message + "\"\n\nPlease try again.";
            window.alert(errStr);
        });
        this.map.addControl(geoLocator);

        // disable rotation gesture
        this.map.dragRotate.disable();
        // and box zoom
        this.map.boxZoom.disable();

        this.leftClickOnAPoint = this.leftClickOnAPoint.bind(this);
        this.map.on('click', function(e) {
            fullyHideSearchBars();
            this.leftClickOnAPoint(e, this.selectingReferencePoint);
        }.bind(this));

        //this.map.on("contextmenu", this.rightClickOnAPoint);

        this.map.on('mousemove', function(e) {
            var lat = e.lngLat.lat.toFixed(3);
            var lng = e.lngLat.lng.toFixed(3);
            $("#point-details > .row > #mouse-move-lat-lng").html(lat + ", " + lng);
            var features = this.map.queryRenderedFeatures(e.point);

            // mouse not under a marker, clear all popups
            if (!features.length) {
                this.areaPopup.remove();
                this.gpsStationNamePopup.remove();
                this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                this.areaMarkerLayer.resetHighlightsOfAllAreaRows(currentArea);
                this.map.getCanvas().style.cursor = 'auto';
                return;
            }
            var frameFeature = this.getFirstPolygonFrameAtPoint(features);
            if (frameFeature) {
                this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                this.areaMarkerLayer.resetHighlightsOfAllAreaRows(null);
                this.areaMarkerLayer.setAreaRowHighlighted(frameFeature.properties.unavco_name);
                this.areaMarkerLayer.setPolygonHighlighted(frameFeature.properties.layerID, "rgba(0, 0, 255, 0.3)");
                this.map.getCanvas().style.cursor = "pointer";
                var rowID = frameFeature.properties.unavco_name;
                this.areaMarkerLayer.setAreaRowHighlighted(rowID);
                var subsetFeatures = this.getSubsetFeatures(frameFeature);
                var haveSubsets = subsetFeatures && subsetFeatures.length > 1;
                if (haveSubsets && $("#search-form-and-results-container").hasClass("maximized")) {
                    var searchFormController = new SearchFormController();
                    $(".show-children-button#" + rowID).mouseover();
                    searchFormController.populateSubsetPopup(frameFeature, subsetFeatures);
                }
                var nameParts = frameFeature.properties.unavco_name.split("_");
                var html = frameFeature.properties.unavco_name;
                if (nameParts[nameParts.length - 1] === "XXXXXXXX") {
                    var lastDate = new AreaAttributesController(this, frameFeature).getAttribute("last_date");
                    html += "<br>Last Date: " + lastDate;
                }

                this.gpsStationNamePopup.setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(this.map);
            } else if (!this.selector.selecting()) {
                var featureViewOptions = this.thirdPartySourcesController.featureToViewOptions(features[0]);
                if (featureViewOptions.coordinates) {
                    // this.gpsStationNamePopup.remove();
                    this.gpsStationNamePopup.setLngLat(featureViewOptions.coordinates)
                        .setHTML(featureViewOptions.html)
                        .addTo(this.map);
                } else {
                    this.areaMarkerLayer.resetHighlightsOfAllMarkers();
                    this.areaMarkerLayer.resetHighlightsOfAllAreaRows(currentArea);
                }
                this.map.getCanvas().style.cursor = featureViewOptions.cursor;
            }
        }.bind(this));

        this.map.on('zoomend', function() {
            var currentZoom = this.map.getZoom();

            var mode = this.getCurrentMode();

            // reshow area markers once we zoom out enough
            // add a small negative epsilon to account for rounding errors...
            // example if we set an initial map zoom of 6, zoomend gets called with
            // a zoom of 5.9999999999999996 etc which makes the map instantly reset when
            // initial zoom is supplied
            if (currentZoom < (this.zoomOutZoom - 1e-8)) {
                if (this.pointsLoaded()) {
                    this.reset();
                    // otherwise, points aren't loaded, but area previously was active
                } else if (this.anAreaWasPreviouslyLoaded()) {
                    this.removeAreaPopups();
                    this.loadAreaMarkers(null);
                    this.map.off("click", this.leftClickOnAPoint);
                }
            }

            this.updateOnTheFlyIfThere();

            if (this.areaSwathsLoaded() && !$("#dataset-frames-toggle-button").hasClass("toggled") && mode !== "seismicity") {
                this.loadSwathsInCurrentViewport(true);
            }

            if (!this.selector.recoloring()) {
                if (this.selector.inSelectMode()) {
                    this.selector.disableSelectMode();
                }
            }

            if (this.thirdPartySourcesController.midasArrows) {
                this.thirdPartySourcesController.updateArrowLengths();
            }

            if (mode === "seismicity") {
                this.seismicityGraphsController.createCrossSectionCharts(null, null, null);
            }

            this.previousZoom = currentZoom;
        }.bind(this));

        this.map.on("moveend", function(e) {
            var bounds = this.map.getBounds();
            var sw = bounds._sw.lat.toFixed(2) + ", " + bounds._sw.lng.toFixed(2);
            var ne = bounds._ne.lat.toFixed(2) + ", " + bounds._ne.lng.toFixed(2);
            $("#usgs-events-current-viewport").html("sw: " + sw + ", ne: " + ne);
            this.updateOnTheFlyIfThere();
            updateUrlState(this);
        }.bind(this));

        this.map.on("dragend", function(e) {
            if (e.source === "recenter") {
                return;
            }

            this.map.setCenter(this.map.getCenter().wrap(), {
                source: "recenter"
            });

            var mode = this.getCurrentMode();

            if (mode === "seismicity") {
                this.seismicityGraphsController.createCrossSectionCharts(null, null, null);
            } else if (this.areaSwathsLoaded() && !$("#dataset-frames-toggle-button").hasClass("toggled")) {
                this.loadSwathsInCurrentViewport(true);
            }
        }.bind(this));
    };

    this.colorDatasetOnDisplacement = function(startDate, endDate) {
        // if we were coloring on velocity, we change the color scale
        // in such a way that the dataset retains the same colors as the current
        // velocity coloring
        if (!this.colorOnDisplacement) {
            this.colorOnDisplacement = true;
            var yearsDiff = (endDate - startDate) / MILLISECONDS_PER_YEAR;
            var min = this.colorScale.min * yearsDiff;
            var max = this.colorScale.max * yearsDiff;
            var limit = this.getPermissibleMinMax(min, max);
            this.colorScale.setMinMax(-limit, limit, true);
        }
        this.colorOnDisplacement = true;
        this.refreshDataset(startDate, endDate);
        this.colorScale.setTitle("LOS Displacement<br>[cm]", "Color on velocity");
        appendOrReplaceUrlVar(/&colorscale=(velocity|displacement)/, "&colorscale=displacement");
    };

    this.colorDatasetOnVelocity = function(startDate, endDate) {
        // if we were coloring on displacement, we change the color scale
        // in such a way that the dataset retains the same colors as the current
        // displacement coloring
        if (this.colorOnDisplacement) {
            this.colorOnDisplacement = false;
            var yearsDiff = (endDate - startDate) / MILLISECONDS_PER_YEAR;
            var min = this.colorScale.min / yearsDiff;
            var max = this.colorScale.max / yearsDiff;
            var limit = this.getPermissibleMinMax(min, max);
            this.colorScale.setMinMax(-limit, limit, true);
        }
        this.colorOnDisplacement = false;
        this.refreshDataset(startDate, endDate);
        this.colorScale.setTitle("LOS Velocity<br>[cm/yr]", "Color on displacement");
        appendOrReplaceUrlVar(/&colorscale=(velocity|displacement)/, "&colorscale=velocity");
    };

    this.pointsLoaded = function() {
        for (var i = 1; currentArea && i <= currentArea.properties.num_chunks; i++) {
            if (this.map.getLayer("chunk_" + i)) {
                return true;
            }
        }

        return false;
    };

    this.areaSwathsLoaded = function() {
        // we always have areas0 at minimum if areas swaths loaded
        // how to avoid checking points loaded? remove area sources when
        // we click on a point
        return !this.areaMarkerLayer.isEmpty() && !this.pointsLoaded();
    };

    this.anAreaWasPreviouslyLoaded = function() {
        return this.tileJSON != null;
    };

    this.removePoints = function() {
        if (!this.pointsLoaded()) {
            return;
        }


        for (var i = 1; i <= currentArea.properties.num_chunks; i++) {
            this.removeLayer("chunk_" + i);
        }
        this.removeSource("insar_vector_source");

        if (this.map.getSource("onTheFlyJSON")) {
            this.removeSourceAndLayer("onTheFlyJSON");
        }

        this.removeSourceAndLayer("DBReferencePoint");
        this.removeSourceAndLayer("ReferencePoint");
    }

    this.removeTouchLocationMarkers = function() {
        // remove selected point marker if it exists, and create a new GeoJSONSource for it
        // prevents crash of "cannot read property 'send' of undefined"
        var layerID = "Top Graph";
        if (this.map.getLayer(layerID)) {
            this.removeLayer(layerID);
            this.removeSource(layerID);

            this.clickLocationMarker = {
                type: "geojson",
                data: {}
            };
        }

        layerID = "Bottom Graph";
        if (this.map.getLayer(layerID)) {
            this.removeLayer(layerID);
            this.removeSource(layerID);

            this.clickLocationMarker2 = {
                type: "geojson",
                data: {}
            };
        }
    };

    this.removeAreaPopups = function() {
        // remove popup which shows area attributes
        $("#area-attributes-div-minimize-button").click();
        // and the graphs
        $("#graph-div-minimize-button").click();

        // and color scale, but only if midas is not up
        if (!this.thirdPartySourcesController.midasLoaded()) {
            this.colorScale.remove();
        }

        // also make sure seismicity isn't loaded and remove seismicity color scale if not
        if (!this.thirdPartySourcesController.seismicityLoaded()) {
            this.seismicityColorScale.remove();
        }
    };

    this.reset = function() {
        this.areas = this.allAreas;
        this.removePoints();
        currentArea = null;
        this.removeTouchLocationMarkers();
        this.selector.cleanup();
        // incase they are up
        this.elevationPopup.remove();
        this.gpsStationPopup.remove();
        this.gpsStationNamePopup.remove();

        this.thirdPartySourcesController.removeAll();
        this.thirdPartySourcesController.USGSEventsOptionsController.UTCTime = "0";

        this.colorDatasetOnVelocity();
        if ($("#dataset-frames-toggle-button").hasClass("toggled")) {
            $("#dataset-frames-toggle-button").click();
        }

        var json = {
            "areas": this.allAreas
        };
        this.addSwathsFromJSON(json, null, true, false);

        this.removeAreaPopups();
        $("#search-form-and-results-container").css("display", "block");
        $("#charts").removeClass("active");
        this.seismicityGraphsController.hideChartContainers();

        $("#point-details > .row > #clicked-point-lat-lng").empty();

        overlayToggleButton.set("off");
        this.tileJSON = null;
        this.colorOnDisplacement = false;

        fullyHideSearchBars();
    };

    this.addContourLines = function() {
        this.addLayer({
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
        this.addLayer({
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
        this.removeLayer("contours");
        this.removeLayer("contour_label");
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

    this.refreshDataset = function(startDate, endDate) {
        var stops = null;
        if (!this.colorOnDisplacement) {
            stops = this.colorScale.getMapboxStops();
        } else {
            var yearsDiff = (endDate - startDate) / MILLISECONDS_PER_YEAR;
            var min = this.insarColorScaleValues.min / yearsDiff;
            var max = this.insarColorScaleValues.max / yearsDiff;
            stops = this.colorScale.getCustomStops(min, max);
        }
        var insarLayers = this.getInsarLayers();
        if (insarLayers) {
            insarLayers.forEach(function(layerID) {
                if (this.map.getPaintProperty(layerID, "circle-color")) {
                    this.map.setPaintProperty(layerID, "circle-color", {
                        "property": 'm',
                        "stops": stops
                    });
                }
            }.bind(this));
        }

        if (this.map.getLayer("onTheFlyJSON")) {
            var property = null;
            try {
                this.map.getPaintProperty("onTheFlyJSON", "circle-color");
            } catch (e) {
                property = "fill-color";
            }
            try {
                this.map.getPaintProperty("onTheFlyJSON", "fill-color");
            } catch (e) {
                property = "circle-color";
            }
            this.map.setPaintProperty("onTheFlyJSON", property, {
                "property": 'm',
                "stops": stops
            });
        }
    };

    this.removeSourceAndLayer = function(name) {
        var removedLayer = false;
        // in removeLayer, pass in false so afterLayersChanged isn't called inside that
        // method. why? because afterLayersChanged relies on getCurrentMode, which in turn
        // relies on the order of sources on the map. thus, if we remove the layer first
        // and then call afterlayers changed, it will create an inconsistency if the layer
        // has been removed, but the corresponding source still hasn't. we can't base
        // getCurrentMode on the order of layers beacause we dont stack layers on top of each other
        // but arrange them in a specified order such that some layers might never be the topmost layer
        // if added last but there is another layer enabled which supercedes that layer on the map stack.
        // TODO: consider renaming afterLayersChanged to something like setCurrentMapMode and don't call it
        // in either removeLayer or setLayer... either call it in both or neither...
        if (this.map.getLayer(name)) {
            this.removeLayer(name, false);
            removedLayer = true;
        }
        if (this.map.getSource(name)) {
            this.removeSource(name);
        }

        if (removedLayer) {
            this.afterLayersChanged(name);
        }
    };

    // if after is supplied, it must hide loading screen
    this.subsetDataset = function(bbox, after) {
        showLoadingScreen("Subsetting Dataset", "ESCAPE or click/tap this box to interrupt");
        hideLoadingScreenWithClick(function() {
            this.cancellableAjax.cancel();
        }.bind(this));
        // too many vector layers leads to browser running out of memory
        // when we set filter
        if (this.tileJSON.vector_layers.length > 1) {
            hideLoadingScreen();
            if (after) {
                after();
            }
            return;
        }
        var sw = {
            lng: bbox[0],
            lat: bbox[1]
        };
        var ne = {
            lng: bbox[2],
            lat: bbox[3]
        };
        var polygonVertices = this.selector.getVerticesOfSquareBbox([sw, ne]);
        var serverBboxCoords = this.selector.verticesOfBboxToLineString(polygonVertices);
        this.cancellableAjax.ajax({
            url: "/WebServicesBox/" + currentArea.properties.unavco_name + "/" + serverBboxCoords,
            success: function(response) {
                var pointIDs = response;
                if (pointIDs.length == 0) {
                    hideLoadingScreen();
                    if (after) {
                        after();
                    }
                    return;
                }
                var filter = ["in", "p"].concat(pointIDs);
                for (var i = 0; i < this.tileJSON.vector_layers.length; i++) {
                    var layerID = this.tileJSON.vector_layers[i].id;
                    if (!this.map.getFilter(layerID)) {
                        this.map.setFilter(layerID, filter);
                    }
                }

                // after must hide loading screen, otherwise we do it
                if (after) {
                    if (this.map.loaded()) {
                        after();
                    } else {
                        this.onRendered(function(callback) {
                            this.map.off("render", callback);
                            after();
                        }.bind(this));
                    }
                } else {
                    hideLoadingScreen();
                }
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
            }.bind(this)
        }, function() {
            hideLoadingScreen();
        });
    };

    this.DMSToDecimalDegrees = function(degrees, minutes, seconds) {
        return degrees + (minutes / 60.0) + (seconds / 3600.0);
    };
}


// function to use AJAX to load json from that same website - TODO: remove me and use jquery
function loadJSON(arg, param, callback) {
    var fullQuery = param + "/"

    for (var key in arg) {
        fullQuery += arg[key] + "/"
    }

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
