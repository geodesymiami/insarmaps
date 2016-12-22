function SquareSelector(map) {
    var that = this;
    this.map = map;
    this.minIndex = -1;
    this.maxIndex = -1;
    this.lastMinIndex = -1;
    this.lastMaxIndex = -1;
    this.bbox = null;
    this.lastbbox = null;
    this.recoloringInProgress = false;

    this.canvas = map.map.getCanvasContainer();
    this.polygonButtonSelected = false;

    // Variable to hold the that.starting xy coordinates
    // when `mousedown` occured.
    this.start;

    // Variable to hold the current xy coordinates
    // when `mousemove` or `mouseup` occurs.
    this.current;

    // Variable for the draw box element.
    this.box;

    this.mousePos = function(e) {
        var rect = that.canvas.getBoundingClientRect();
        return new mapboxgl.Point(
            e.clientX - rect.left - that.canvas.clientLeft,
            e.clientY - rect.top - that.canvas.clientTop
        );
    };
    this.onMouseMove = function(e) {
        // Capture the ongoing xy coordinates
        that.current = that.mousePos(e);

        // Append the box element if it doesnt exist
        if (!that.box) {
            that.box = document.createElement('div');
            that.box.classList.add('boxdraw');
            that.canvas.appendChild(that.box);
        }

        var minX = Math.min(that.start.x, that.current.x),
            maxX = Math.max(that.start.x, that.current.x),
            minY = Math.min(that.start.y, that.current.y),
            maxY = Math.max(that.start.y, that.current.y);

        // Adjust width and xy position of the box element ongoing
        var pos = 'translate(' + minX + 'px,' + minY + 'px)';
        that.box.style.transform = pos;
        that.box.style.WebkitTransform = pos;
        that.box.style.width = maxX - minX + 'px';
        that.box.style.height = maxY - minY + 'px';
    };

    this.onMouseUp = function(e) {
        // Capture xy coordinates
        that.bbox = [that.map.map.unproject(that.start), that.map.map.unproject(that.mousePos(e))];
        that.finish(that.bbox);
    };

    this.onKeyDown = function(e) {
        // If the ESC key is pressed
        if (e.keyCode === 27) finish();
    };
    // Set `true` to dispatch the event before other functions
    // call it. This is necessary for disabling the default map
    // dragging behaviour.
    this.mouseDown = function(e) {
        // Continue the rest of the function if the shiftkey is pressed.
        if (!(e.shiftKey && e.button === 0) && !that.polygonButtonSelected) return;
        // Disable default drag zooming when the shift key is held down.
        that.map.map.dragPan.disable();
        // Call functions for the following events
        document.addEventListener('mousemove', that.onMouseMove);
        document.addEventListener('mouseup', that.onMouseUp);
        document.addEventListener('keydown', that.onKeyDown);

        // Capture the first xy coordinates
        that.start = that.mousePos(e);
    };

    this.canvas.addEventListener('mousedown', this.mouseDown, true);

    this.finish = function(bbox) {
        document.removeEventListener('mousemove', that.onMouseMove);
        document.removeEventListener('keydown', that.onKeyDown);
        document.removeEventListener('mouseup', that.onMouseUp);

        // re enable dragpan only if polygon button isn't selected
        if (!that.map.selector.polygonButtonSelected) {
            that.map.map.dragPan.enable();
        }

        if (that.box) {
            that.box.parentNode.removeChild(that.box);
            that.box = null;
        }

        // If bbox exists. use this value as the argument for `queryRenderedFeatures`
        if (bbox) {
            that.recolorDataset();
        }
    };

    // courtesy of: https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // see: http://stackoverflow.com/questions/11716268/point-in-polygon-algorithm
    this.pointInPolygon = function(vertices, testPoint) {
        var i, j = 0;
        var pointIsInPolygon = false;
        var numberVertices = vertices.length;

        var x = 0;
        var y = 1;

        for (i = 0, j = numberVertices - 1; i < numberVertices; j = i++) {
            if (((vertices[i][y] > testPoint[y]) != (vertices[j][y] > testPoint[y])) &&
                (testPoint[x] < (vertices[j][x] - vertices[i][x]) * (testPoint[y] - vertices[i][y]) / (vertices[j][y] - vertices[i][y]) + vertices[i][x])) {
                pointIsInPolygon = !pointIsInPolygon;
            }
        }

        return pointIsInPolygon;
    };

    this.recolorDatasetWithBoundingBoxAndMultiplier = function(box, multiplier) {
        if (that.recoloringInProgress) {
            return;
        }

        if (that.map.map.getSource("onTheFlyJSON")) {
            that.map.map.removeSource("onTheFlyJSON");
            that.map.map.removeLayer("onTheFlyJSON");
        }

        // get the names of all the layers
        var pointLayers = [];
        for (var i = 1; i < that.map.layers_.length; i++) {
            pointLayers.push(that.map.layers_[i].id);
        }

        var features = null;
        if (box) {
            var pixelBoundingBox = [that.map.map.project(box[0]), that.map.map.project(box[1])];
            features = that.map.map.queryRenderedFeatures(pixelBoundingBox, { layers: pointLayers });
        // no bounding bax
        } else {
            features = that.map.map.queryRenderedFeatures({ layers: pointLayers });
        }

        if (features.length == 0) {
            return;
        }

        if (features.length >= 60000) {
            return window.alert('Select a smaller number of features');
        }
        // Run through the selected features and set a filter
        // to match features with unique FIPS codes to activate
        // the `counties-highlighted` layer.
        // var filter = features.reduce(function(memo, feature) {
        //     memo.push(feature.properties.FIPS);
        //     return memo;
        // }, ['in', 'FIPS']);
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

        showLoadingScreen("Recoloring in progress...");

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
        that.recoloringInProgress = true;

        $.ajax({
            url: "/points",
            type: "post",
            async: true,
            data: {
                points: query
            },
            success: function(response) {
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
                    var sub_displacements = displacement_array.slice(that.minIndex, that.maxIndex + 1);
                    var sub_decimal_dates = decimal_dates.slice(that.minIndex, that.maxIndex + 1);

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
                if (that.map.map.getSource("onTheFlyJSON")) {
                    that.map.map.removeSource("onTheFlyJSON");
                    that.map.map.removeLayer("onTheFlyJSON");
                }
                that.map.map.addSource("onTheFlyJSON", {
                    "type": "geojson",
                    "data": geoJSONData
                });

                that.map.map.addLayer({
                    "id": "onTheFlyJSON",
                    "type": "circle",
                    "source": "onTheFlyJSON",
                    "paint": {
                        'circle-color': {
                            property: 'm',
                            stops: that.map.colorScale.getMapboxStops()
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
                that.recoloringInProgress = false;
                hideLoadingScreen();
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                hideLoadingScreen();
            }
        });
    };

    this.recolorDataset = function() {
        if (that.bbox == null) {
            return;
        }

        // haven't selected min and max, so exit
        if (that.minIndex == -1 || that.maxIndex == -1) {
            return;
        }

        // haven't changed since last recoloring? well dont recolor (only if it's the same area of course)
        if (that.lastbbox == that.bbox && that.lastMinIndex == that.minIndex && that.lastMaxIndex == that.maxIndex) {
            return;
        }

        that.lastMinIndex = that.minIndex;
        that.lastMaxIndex = that.maxIndex;
        that.lastbbox = that.bbox;

        that.recolorDatasetWithBoundingBoxAndMultiplier(that.bbox, 1);
    };
}
