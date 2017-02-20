function RecolorSelector() {}

function setupRecolorSelector() {
    RecolorSelector.prototype.recoloringInProgress = false;
    RecolorSelector.prototype.finish = function(bbox) {
        // re enable dragpan only if polygon button isn't selected
        if (!this.map.selector.polygonButtonSelected) {
            this.map.map.dragPan.enable();
        }

        if (this.box) {
            this.box.parentNode.removeChild(this.box);
            this.box = null;
        }

        this.lastbbox = this.bbox;
        if (this.bbox == null || this.minIndex == -1 || this.maxIndex == -1) {
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
            this.recolorOnDisplacement(startDate, endDate, "Recoloring...");
        } else {
            this.recolorDataset();
        }
    };

    RecolorSelector.prototype.recolorOnDisplacement = function(startDecimalDate, endDecimalDate, loadingText) {
        var millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
        var yearsElapsed = (endDecimalDate - startDecimalDate) / millisecondsPerYear;

        this.recolorDatasetWithBoundingBoxAndMultiplier(null, yearsElapsed, loadingText);
    };

    RecolorSelector.prototype.recolorDatasetWithBoundingBoxAndMultiplier = function(box, multiplier, loadingText) {
        // let the caller check if a coloring is in progress. otherwise user has to sometimes
        //  wait if they cancel a recoloring and want to do another one

        if (this.map.map.getSource("onTheFlyJSON")) {
            this.map.map.removeSource("onTheFlyJSON");
            this.map.map.removeLayer("onTheFlyJSON");
        }

        // get the names of all the layers
        var pointLayers = [];
        for (var i = 1; i < this.map.layers_.length; i++) {
            pointLayers.push(this.map.layers_[i].id);
        }

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

        showLoadingScreen(loadingText);

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

        $.ajax({
            url: "/points",
            type: "post",
            async: true,
            data: {
                points: query
            },
            success: function(response) {
                if (this.cancelRecoloring) {
                    this.cancelRecoloring = false;
                    return;
                }
                console.log("Received points");
                // console.log(response);
                var json = JSON.parse(response);
                // if (geoJSONData.features.length != json.displacements.length) {
                //     console.log("not the same size json is " + json.displacements.length + " while features is " + geoJSONData.features.length);
                // }
                for (var i = 0; i < geoJSONData.features.length; i++) {
                    var curFeature = geoJSONData.features[i];

                    var date_string_array = json.string_dates;
                    var date_array = convertStringsToDateArray(date_string_array);
                    var decimal_dates = json.decimal_dates;
                    var displacement_array = json.displacements[i];
                    var sub_displacements = displacement_array.slice(this.minIndex, this.maxIndex + 1);
                    var sub_decimal_dates = decimal_dates.slice(this.minIndex, this.maxIndex + 1);

                    // // returns array for displacement on chart
                    // chart_data = getDisplacementChartData(displacement_array, date_string_array);

                    // calculate and render a linear regression of those dates and displacements
                    var result = calcLinearRegression(sub_displacements, sub_decimal_dates);
                    var slope = result["equation"][0] * multiplier; // useful to get other derivatives such as position instead of velocity
                    var y = result["equation"][1];
                    // console.log("before " + curFeature.properties.m)
                    // console.log("slope is " + slope);
                    // console.log(curFeature);
                    curFeature.properties.m = slope;
                    // console.log("after " + curFeature.properties.m);
                    // console.log(curFeature);
                }
                if (this.map.map.getSource("onTheFlyJSON")) {
                    this.map.map.removeSource("onTheFlyJSON");
                    this.map.map.removeLayer("onTheFlyJSON");
                }
                this.map.map.addSource("onTheFlyJSON", {
                    "type": "geojson",
                    "data": geoJSONData
                });

                this.map.map.addLayer({
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
                });
                this.recoloringInProgress = false;
                hideLoadingScreen();
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                hideLoadingScreen();
            }
        });
    };

    RecolorSelector.prototype.recolorDataset = function() {
        this.recolorDatasetWithBoundingBoxAndMultiplier(this.bbox, 1);
    };

    RecolorSelector.prototype.recoloring = function() {
        return this.recoloringInProgress;
    };
}
