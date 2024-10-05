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
        } else if (mode === "insar") { // said we don't need it for now, but keep to make sure
            // if (this.minIndex == -1 || this.maxIndex == -1) {
            //     return;
            // }

            // // haven't changed since last recoloring? well dont recolor (only if it's the same area of course)
            // if (this.lastbbox == this.bbox && this.lastMinIndex == this.minIndex && this.lastMaxIndex == this.maxIndex) {
            //     return;
            // }

            // // cancelled recoloring at any point...
            // if (this.cancelRecoloring) {
            //     this.cancelRecoloring = false;
            //     return;
            // }

            // if (this.map.colorOnDisplacement) {
            //     var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.string_dates));
            //     var startDate = new Date(dates[this.minIndex]);
            //     var endDate = new Date(dates[this.maxIndex]);
            //     this.recolorOnDisplacement(startDate, endDate, "Recoloring...", "ESCAPE to interrupt");
            // } else {
            //     this.recolorDataset();
            // }
        } else if (mode === "gps") {
            // TODO: logic for gps selection
        }
    };

    FeatureSelector.prototype.recolorOnDisplacement = function(startDecimalDate, endDecimalDate, loadingTextTop, loadingTextBottom) {
        const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
        var yearsElapsed = (endDecimalDate - startDecimalDate) / millisecondsPerYear;
        var multiplier = 1.0 / yearsElapsed;

        this.recolorDatasetWithBoundingBoxAndMultiplier(null, multiplier, loadingTextTop, loadingTextBottom, this.map.referenceDisplacements);
    };

    FeatureSelector.prototype.recolorDatasetWithBoundingBoxAndMultiplier = function(box, multiplier, loadingTextTop, loadingTextBottom, refDisplacements=null) {
        // let the caller check if a coloring is in progress. otherwise user has to sometimes
        //  wait if they cancel a recoloring and want to do another one

        // get the names of all the layers
        var pointLayers = ["onTheFlyJSON"];
        var features = null;
        if (!this.map.insarLayersHidden()) {
            pointLayers = this.map.getInsarLayers();
        }

        showLoadingScreen(loadingTextTop, loadingTextBottom);
        // nested request animation frame ensures that loading screen is shown
        // first. and queryRenderedFeatures (which takes long time in some cases)
        // only called after loading screen already being rendered
        // see: https://macarthur.me/posts/when-dom-updates-appear-to-be-asynchronous
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (box) {
                    var pixelBoundingBox = [this.map.map.project(box[0]), this.map.map.project(box[1])];
                    features = this.map.map.queryRenderedFeatures(pixelBoundingBox, { layers: pointLayers });
                    // no bounding box
                } else {
                    features = this.map.map.queryRenderedFeatures({ layers: pointLayers });
                }

                this.lastbbox = this.bbox;
                if (!features || features.length == 0) {
                    hideLoadingScreen();
                    return;
                }

                var geoJSONData = {
                    "type": "FeatureCollection",
                    "features": []
                };

                var featuresMap = [];

                var query = "(";

                // may be placebo effect, but seems to speed up query from db. also
                // sort by p in ascending order so we match displacements with the features
                features.sort(function(a, b) {
                    return a.properties.p - b.properties.p;
                });


                for (var i = 0; i < features.length; i++) {
                    var long = features[i].geometry.coordinates[0];
                    var lat = features[i].geometry.coordinates[1];
                    var curFeatureKey = features[i].properties.p.toString();

                    // mapbox gives us duplicate tiles (see documentation to see how query rendered features works)
                    // yet we only want unique features, not duplicates
                    if (featuresMap[curFeatureKey] != null) {
                        continue;
                    }
                    query += features[i].properties.p.toString() + "),(";
                    featuresMap[curFeatureKey] = "1";

                    if (this.map.highResMode() || !this.map.insarActualPixelSize) {
                        if (features[i].geometry.type == "Polygon") {
                            long = features[i].geometry.coordinates[0][0][0];
                            lat = features[i].geometry.coordinates[0][0][1];
                        }
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
                    } else {
                        var coordinates = null;
                        if (features[i].geometry.type == "Polygon") {
                            // when we query only the current onTheFlyJSON, we might get polygons or points.
                            // not a problem when we query the mbtiles insar layer as we only get points then
                            coordinates = features[i].geometry.coordinates;
                        } else {
                            var attributesController = new AreaAttributesController(this.map, currentArea);
                            var x_step = parseFloat(attributesController.getAttribute("X_STEP"));
                            var y_step = parseFloat(attributesController.getAttribute("Y_STEP"));
                            coordinates = [
                                    [
                                        [long, lat], [long + x_step, lat], [long + x_step, lat + y_step],
                                        [long, lat + y_step], [long, lat]
                                    ]
                            ];
                        }
                        geoJSONData.features.push({
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": coordinates
                            },
                            "properties": {
                                "m": 0,
                                "p": features[i].properties.p
                            }
                        });
                    }
                }

                query = query.substring(0, query.length - 2);

                //console.log("in here it is " + geoJSONData.features.length + " features is " + features.length);
                //console.log(query);
                this.recoloringInProgress = true;
                hideLoadingScreenWithClick(function() {
                    geoJSONData = null;
                    features = null;
                    this.cancellableAjax.cancel();
                }.bind(this));
                features = null;

                var minIndex = this.minIndex;
                var maxIndex = this.maxIndex;
                var referenceDisplacements = null;
                if (refDisplacements !== null) {
                    // postgresql array literal
                    referenceDisplacements = "{" + refDisplacements.toString() + "}";
                }

                this.cancellableAjax.xmlHTTPRequestAjax({
                    url: "/points",
                    type: "post",
                    async: true,
                    data: {
                        area: currentArea.properties.unavco_name,
                        points: query,
                        arrayMinIndex: minIndex,
                        arrayMaxIndex: maxIndex,
                        referenceDisplacements: referenceDisplacements
                    },
                    success: function(response) {
                        var arrayBuffer = response;
                        if (!(minIndex == this.minIndex && maxIndex == this.maxIndex)) {
                            // the minIndex and maxIndex used for the query are not equal
                            // to the current selector's min and max Index. means another
                            // recoloring has occurred and this data is now stale
                            return;
                        }

                        if (arrayBuffer) {
                            // the data comes as follows: the dates come first, followed by a large array
                            // of all the displacements for all the points, sequentially
                            // each feature above is sorted, and server returns dates by the
                            // point ID in sorted order as well. we use minIndex and maxIndex
                            // to allocate (maxIndex - minIndex) + 1 displacements to each point
                            var json = new Float64Array(arrayBuffer);
                            for (var i = 0; i < geoJSONData.features.length; i++) {
                                var curFeature = geoJSONData.features[i];
                                curFeature.properties.m = json[i];
                            }


                            var geoJSONSource = this.map.map.getSource("onTheFlyJSON");
                            // always use the insar color scale values for coloring on the fly...
                            var min = this.map.insarColorScaleValues.min * multiplier;
                            var max = this.map.insarColorScaleValues.max * multiplier;
                            var stops = this.map.colorScale.stopsCalculator.colorsToMapboxStops(min, max, this.map.colorScale.currentScale);
                            var radii = this.map.highResMode() ? this.map.highResRadiusStops: this.map.radiusStops;
                            if (geoJSONSource) {
                                geoJSONSource.setData(geoJSONData);
                            } else {
                                this.map.onceRendered(function() {
                                    this.map.hideInsarLayers();
                                }.bind(this));
                                this.map.addSource("onTheFlyJSON", {
                                    "type": "geojson",
                                    "data": geoJSONData
                                });
                            }
                            geoJSONData = null;
                            var before = this.map.getLayerOnTopOf("onTheFlyJSON");
                            if (this.map.map.getLayer("onTheFlyJSON")) {
                                this.map.removeLayer("onTheFlyJSON");
                            }
                            if (this.map.highResMode() || !this.map.insarActualPixelSize) {
                                this.map.addLayer({
                                    "id": "onTheFlyJSON",
                                    "type": "circle",
                                    "source": "onTheFlyJSON",
                                    "paint": {
                                        'circle-color': {
                                            property: 'm',
                                            stops: stops
                                        },
                                        'circle-radius': {
                                            // for an explanation of this array see here:
                                            // https://www.mapbox.com/blog/data-driven-styling/
                                            stops: radii
                                        }
                                    }
                                }, before);
                            } else {
                                this.map.addLayer({
                                    "id": "onTheFlyJSON",
                                    "type": "fill",
                                    "source": "onTheFlyJSON",
                                    "paint": {
                                        'fill-color': {
                                            property: 'm',
                                            stops: stops
                                        }
                                    }
                                }, before);
                            }
                        } else {
                            window.alert("Server encountered an error");
                        }

                        mapboxgl.clearStorage()
                        if (this.map.selectingReferencePoint) {
                            this.map.doneSelectingReferencePoint();
                        }
                        this.recoloringInProgress = false;
                        this.map.onceRendered(function() {
                            // since we remove and add the oonTheFlyJSON layer
                            // (because we alternate between points and polygons
                            // now for actual size), sometimes the loading screen
                            // will be removed but the layer not rendered yet
                            // causing exception in queryRenderedFeatures
                            // on mousemove if user does it fast enough.
                            // hiding loading screen only after layer has been rendered
                            // prevents this
                            hideLoadingScreen();
                        }.bind(this));
                    }.bind(this),
                    error: function(xhr, ajaxOptions, thrownError) {
                        console.log("failed " + xhr.responseText);
                        this.map.showInsarLayers();
                        this.doneRecoloring();
                        geoJSONData = null;
                    }.bind(this),
                    requestHeader: {
                        'Content-type': 'application/x-www-form-urlencoded'
                    },
                    responseType: "arraybuffer"
                }, function() {
                    this.map.showInsarLayers();
                    this.doneRecoloring();
                    geoJSONData = null;
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    FeatureSelector.prototype.doneRecoloring = function() {
        hideLoadingScreen();
        this.recoloringInProgress = false;
    };

    FeatureSelector.prototype.recolorDataset = function() {
        if (this.map.colorOnDisplacement) {
            var dates = this.getCurrentStartEndDateFromArea(currentArea);
            this.recolorOnDisplacement(dates.startDate, dates.endDate, "Recoloring...", "ESCAPE or click/tap this box to interrupt");
        } else {
            var nonDefaultReferencePoint = this.map.selectingReferencePoint || this.map.map.getSource("ReferencePoint") != null;
            if (nonDefaultReferencePoint) {
                this.recolorDatasetWithBoundingBoxAndMultiplier(this.bbox, 1, "Recoloring in progress...", "ESCAPE or click/tap this box to interrupt",
                                                            this.map.referenceDisplacements);
            } else {
                this.recolorDatasetWithBoundingBoxAndMultiplier(this.bbox, 1, "Recoloring in progress...", "ESCAPE or click/tap this box to interrupt", null);
            }
        }
    };

    FeatureSelector.prototype.refreshDatasetWithNewReferencePoint = function(displacements) {
        if (this.map.colorOnDisplacement) {
            var dates = this.getCurrentStartEndDateFromArea(currentArea);
            this.recolorOnDisplacement(dates.startDate, dates.endDate, "Recoloring...", "ESCAPE or click/tap this box to interrupt");
        } else {
            this.recolorDatasetWithBoundingBoxAndMultiplier(this.bbox, 1, "Recoloring in progress...", "ESCAPE or click/tap this box to interrupt", displacements);
        }
    };

    FeatureSelector.prototype.recoloring = function() {
        return this.recoloringInProgress;
    };

    FeatureSelector.prototype.getCurrentStartEndDateFromArea = function(area) {
        var dates = convertStringsToDateArray((new AreaAttributesController(myMap, area)).getAttribute("string_dates"));
        var startDate = dates[0];
        var endDate = dates[dates.length - 1];
        if (this.minIndex != -1 && this.maxIndex != -1) {
            startDate = dates[this.minIndex];
            endDate = dates[this.maxIndex];
        }

        return {
            startDate: startDate,
            endDate: endDate
        }
    };
}

