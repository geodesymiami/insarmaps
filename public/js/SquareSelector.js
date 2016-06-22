function SquareSelector(map) {
    var that = this;
    this.map = map;
    this.canvas = map.map.getCanvasContainer();

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
        that.finish([that.start, that.mousePos(e)]);
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
        if (!(e.shiftKey && e.button === 0)) return;
        // Disable default drag zooming when the shift key is held down.
        that.map.map.dragPan.disable();
        console.log("hello");
        // Call functions for the following events
        document.addEventListener('mousemove', that.onMouseMove);
        document.addEventListener('mouseup', that.onMouseUp);
        document.addEventListener('keydown', that.onKeyDown);

        // Capture the first xy coordinates
        that.start = that.mousePos(e);
    };

    this.canvas.addEventListener('mousedown', this.mouseDown, true);

    this.finish = function(bbox) {
        // Remove these events now that finish has been called.
        document.removeEventListener('mousemove', that.onMouseMove);
        document.removeEventListener('keydown', that.onKeyDown);
        document.removeEventListener('mouseup', that.onMouseUp);

        if (that.box) {
            that.box.parentNode.removeChild(that.box);
            that.box = null;
        }

        // If bbox exists. use this value as the argument for `queryRenderedFeatures`
        if (bbox) {
            if (that.map.map.getSource("onTheFlyJSON")) {
                that.map.map.removeSource("onTheFlyJSON");
                that.map.map.removeLayer("onTheFlyJSON");
            }

            // get the names of all the layers
            var pointLayers = [];
            for (var i = 1; i < that.map.layers_.length; i++) {
            	pointLayers.push(that.map.layers_[i].id);
            }
            console.log(pointLayers);
            var features = that.map.map.queryRenderedFeatures(bbox, { layers: pointLayers });
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
            var query = "/points/" + currentArea.name + "/";

            for (var i = 0; i < features.length; i++) {
                query += features[i].properties.c.toString() + ":" + features[i].properties.p.toString() + "/";
                geoJSONData.features.push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [features[i].geometry.coordinates[0], features[i].geometry.coordinates[1]]
                    },
                    "properties": {
                        "m": 0
                    }
                });
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
                        stops: [
                            [-0.02, '#0000FF'], // blue
                            [-0.01, '#00FFFF'], // cyan
                            [0.0, '#01DF01'], // lime green
                            [0.01, '#FFBF00'], // yellow orange
                            [0.02, '#FF0000'] // red orange
                        ]
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
            console.log(query);
            $.getJSON(query, function(json) {
                var minIndex = 4;
                var maxIndex = 5;

                var decimalDates = json[0];

                for (var i = 0; i < geoJSONData.features.length; i++) {
                    var curFeature = geoJSONData.features[i];

                    var date_string_array = json.string_dates[i];
                    var date_array = convertStringsToDateArray(date_string_array);
                    var decimal_dates = json.decimal_dates[i];
                    var displacement_array = json.displacements[i];

                    // // returns array for displacement on chart
                    // chart_data = getDisplacementChartData(displacement_array, date_string_array);

                    // calculate and render a linear regression of those dates and displacements
                    var result = calcLinearRegression(displacement_array, decimal_dates);
                    var slope = result["equation"][0];
                    var y = result["equation"][1];
                    console.log("before " + curFeature.properties.m)
                    console.log("slope is " + slope);
                    console.log(curFeature);
                    curFeature.properties.m = slope;
                    console.log("after " + curFeature.properties.m)
                    console.log(curFeature);
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
                            stops: [
                                [-0.02, '#0000FF'], // blue
                                [-0.01, '#00FFFF'], // cyan
                                [0.0, '#01DF01'], // lime green
                                [0.01, '#FFBF00'], // yellow orange
                                [0.02, '#FF0000'] // red orange
                            ]
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
            }).fail(function() {
                console.log("error");
            });
        }

        that.map.map.dragPan.enable();
    };
}
