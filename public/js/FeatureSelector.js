function FeatureSelector() {
    this.recoloringInProgress = false;
    this.selectionPolygonActive = false;
}

function setupFeatureSelector() {
    FeatureSelector.prototype.cleanup = function() {
        if (this.map.map.getSource("onTheFlyJSON")) {
            this.map.removeSourceAndLayer("onTheFlyJSON");
        }

        if (this.map.map.getSource("seismicitySelectedArea")) {
            this.map.removeSourceAndLayer("seismicitySelectedArea");
        }
    };

    FeatureSelector.prototype.addSelectionPolygonFromMapBounds = function(mapBounds) {
        var bbox = [mapBounds._ne, mapBounds._sw];
        var selectedAreaPolygon = this.squareBboxToMapboxPolygon(bbox);

        if (this.map.map.getSource("seismicitySelectedArea")) {
            this.map.removeSourceAndLayer("seismicitySelectedArea");
        }
        this.map.addSource("seismicitySelectedArea", {
            "type": "geojson",
            "data": selectedAreaPolygon
        });
        this.map.addLayer({
            'id': 'seismicitySelectedArea',
            'type': 'fill',
            'source': "seismicitySelectedArea",
            'layout': {},
            'paint': {
                'fill-color': '#088',
                'fill-opacity': 0.5
            }
        });
        this.selectionPolygonActive = true;
    };

    FeatureSelector.prototype.removeSelectionPolygon = function() {
        if (this.map.map.getSource("seismicitySelectedArea")) {
            this.map.removeSourceAndLayer("seismicitySelectedArea");
            this.selectionPolygonActive = false;
        }
    };

    FeatureSelector.prototype.getAllRenderedSeismicityFeatures = function(bbox) {
        var seismicityLayers = this.map.getLayerIDsInCurrentMode();
        var features = null;
        if (bbox) {
            var pixelBoundingBox = [this.map.map.project(bbox[0]), this.map.map.project(bbox[1])];
            features = this.map.map.queryRenderedFeatures(pixelBoundingBox, { layers: seismicityLayers });
        } else {
            features = this.map.map.queryRenderedFeatures({ layers: seismicityLayers });
        }

        features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        return this.getUniqueFeatures(features);
    };

    FeatureSelector.prototype.createOnlyCrossSectionPlots = function(bbox) {
        var features = this.getAllRenderedSeismicityFeatures(bbox);
        if (features.length == 0) {
            return;
        }

        this.map.seismicityGraphsController.createCrossSectionCharts(null, null, features);
    };

    FeatureSelector.prototype.createSeismicityPlots = function(bbox) {
        var features = this.getAllRenderedSeismicityFeatures(bbox);
        if (features.length == 0) {
            return;
        }
        this.map.seismicityGraphsController.setBbox(bbox);
        // show containers before creating as we have an optimization to not create
        // unless containers are shown. also, we want to hide cross section charts and show other charts
        this.map.seismicityGraphsController.hideCrossSectionCharts();
        this.map.seismicityGraphsController.showCharts();
        this.map.seismicityGraphsController.createAllCharts(null, null, features);
    };

    FeatureSelector.prototype.finish = function(bbox) {
        this.disableSelectMode();
        // re enable dragpan only if polygon button isn't selected
        if (!this.map.selector.polygonButtonSelected) {
            this.map.map.dragPan.enable();
        }

        if (this.box) {
            this.box.parentNode.removeChild(this.box);
            this.box = null;
        }

        this.lastbbox = this.bbox;
        if (this.bbox == null) {
            return;
        }

        var mode = this.map.getCurrentMode();

        if (mode === "seismicity") {
            this.createSeismicityPlots(bbox);
            var bounds = this.map.seismicityGraphsController.getMinimapBounds();
            if (bounds) {
                this.addSelectionPolygonFromMapBounds(this.map.seismicityGraphsController.mapForPlot.getBounds());
            }
        } else if (mode === "insar") {
            if (this.minIndex == -1 || this.maxIndex == -1) {
                return;
            }

            // haven't changed since last recoloring? well dont recolor (only if it's the same area of course)
            if (this.lastbbox == this.bbox && this.lastMinIndex == this.minIndex && this.lastMaxIndex == this.maxIndex) {
                return;
            }

            // cancelled recoloring at any point...
            if (this.cancelRecoloring) {
                this.cancelRecoloring = false;
                return;
            }

            if (this.map.colorOnDisplacement) {
                var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.string_dates));
                var startDate = new Date(dates[this.minIndex]);
                var endDate = new Date(dates[this.maxIndex]);
                this.recolorOnDisplacement(startDate, endDate, "Recoloring...", "ESCAPE to interrupt");
            } else {
                this.recolorDataset();
            }
        } else if (mode === "gps") {
            // TODO: logic for gps selection
        }
    };

    FeatureSelector.prototype.recolorOnDisplacement = function(startDecimalDate, endDecimalDate, loadingTextTop, loadingTextBottom) {
        const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
        var yearsElapsed = (endDecimalDate - startDecimalDate) / millisecondsPerYear;

        this.recolorDatasetWithBoundingBoxAndMultiplier(null, yearsElapsed, loadingTextTop, loadingTextBottom);
    };

    FeatureSelector.prototype.recolorDatasetWithBoundingBoxAndMultiplier = function(box, multiplier, loadingTextTop, loadingTextBottom) {
        // let the caller check if a coloring is in progress. otherwise user has to sometimes
        //  wait if they cancel a recoloring and want to do another one

        if (this.map.map.getSource("onTheFlyJSON")) {
            this.map.removeSourceAndLayer("onTheFlyJSON");
        }

        // get the names of all the layers
        var pointLayers = this.map.getInsarLayers();

        var features = null;
        if (box) {
            var pixelBoundingBox = [this.map.map.project(box[0]), this.map.map.project(box[1])];
            features = this.map.map.queryRenderedFeatures(pixelBoundingBox, { layers: pointLayers });
            // no bounding box
        } else {
            features = this.map.map.queryRenderedFeatures({ layers: pointLayers });
        }

        this.lastbbox = this.bbox;
        if (features.length == 0) {
            return;
        }

        var MAX_FEATURES_TO_RECOLOR = 60000;
        if (features.length >= MAX_FEATURES_TO_RECOLOR) {
            window.alert('Recoloring ' + features.length +
                ' features (max ' + MAX_FEATURES_TO_RECOLOR +
                '). Please select a smaller number of features, zoom out, or zoom' + ' in to a smaller section of the map.');
            return;
        }

        var geoJSONData = {
            "type": "FeatureCollection",
            "features": []
        };

        var featuresMap = [];

        var query = currentArea.properties.unavco_name + "/";

        // may be placebo effect, but seems to speed up query from db. also
        // sort by p in ascending order so we match displacements with the features
        features.sort(function(a, b) {
            return a.properties.p - b.properties.p;
        });

        showLoadingScreen(loadingTextTop, loadingTextBottom);

        for (var i = 0; i < features.length; i++) {
            var long = features[i].geometry.coordinates[0];
            var lat = features[i].geometry.coordinates[1];
            var curFeatureKey = features[i].properties.p.toString();

            // mapbox gives us duplicate tiles (see documentation to see how query rendered features works)
            // yet we only want unique features, not duplicates
            if (featuresMap[curFeatureKey] != null) {
                continue;
            }

            query += features[i].properties.p.toString() + "/";
            featuresMap[curFeatureKey] = "1";

            geoJSONData.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [long, lat]
                },
                "properties": {
                    "m": 0,
                    "p": features[i].properties.p
                }
            });
        }

        //console.log("in here it is " + geoJSONData.features.length + " features is " + features.length);
        //console.log(query);
        this.recoloringInProgress = true;

        this.cancellableAjax.xmlHTTPRequestAjax({
            url: "/points",
            type: "post",
            async: true,
            data: {
                points: query,
                arrayMinIndex: this.minIndex,
                arrayMaxIndex: this.maxIndex
            },
            success: function(response) {
                var arrayBuffer = response;

                if (arrayBuffer) {
                    var json = new Float64Array(arrayBuffer);
                    if (this.cancelRecoloring) {
                        this.cancelRecoloring = false;
                        return;
                    }
                    console.log("Received points");

                    for (var i = 0; i < geoJSONData.features.length; i++) {
                        var curFeature = geoJSONData.features[i];
                        curFeature.properties.m = parseFloat(json[i]) * multiplier; // useful to get other derivatives such as position instead of velocity
                    }
                    if (this.map.map.getSource("onTheFlyJSON")) {
                        this.map.removeSource("onTheFlyJSON");
                        this.map.removeLayer("onTheFlyJSON");
                    }
                    this.map.addSource("onTheFlyJSON", {
                        "type": "geojson",
                        "data": geoJSONData
                    });

                    var before = this.map.getLayerOnTopOf("onTheFlyJSON");
                    this.map.addLayer({
                        "id": "onTheFlyJSON",
                        "type": "circle",
                        "source": "onTheFlyJSON",
                        "paint": {
                            'circle-color': {
                                property: 'm',
                                stops: this.map.colorScale.getMapboxStops()
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
                    }, before);
                } else {
                    window.alert("Server encountered an error");
                }

                this.recoloringInProgress = false;
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                hideLoadingScreen();
            },
            requestHeader: {
                'Content-type': 'application/x-www-form-urlencoded'
            },
            responseType: "arraybuffer"
        }, function() {
            this.cancelRecoloring = true;
            hideLoadingScreen();
        });
    };

    FeatureSelector.prototype.recolorDataset = function() {
        this.recolorDatasetWithBoundingBoxAndMultiplier(this.bbox, 1, "Recoloring in progress...", "ESCAPE to interrupt");
    };

    FeatureSelector.prototype.recoloring = function() {
        return this.recoloringInProgress;
    };
}