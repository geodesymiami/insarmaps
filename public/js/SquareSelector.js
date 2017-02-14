function SquareSelector() {
    var that = this;
    this.map = null;
    this.minIndex = -1;
    this.maxIndex = -1;
    this.lastMinIndex = -1;
    this.lastMaxIndex = -1;
    this.bbox = null;
    this.lastbbox = null;
    this.associatedButton = null;

    this.canvas = null;
    this.polygonButtonSelected = false;

    // Variable to hold the this.starting xy coordinates
    // when `mousedown` occured.
    this.start;

    // Variable to hold the current xy coordinates
    // when `mousemove` or `mouseup` occurs.
    this.current;

    // Variable for the draw box element.
    this.box;

    this.mousePos = function(e) {
        var rect = this.canvas.getBoundingClientRect();
        return new mapboxgl.Point(
            e.clientX - rect.left - this.canvas.clientLeft,
            e.clientY - rect.top - this.canvas.clientTop
        );
    };
    this.onMouseMove = function(e) {
        // Capture the ongoing xy coordinates
        this.current = this.mousePos(e);

        // Append the box element if it doesnt exist
        if (!this.box) {
            this.box = document.createElement('div');
            this.box.classList.add('boxdraw');
            this.canvas.appendChild(this.box);
        }

        var minX = Math.min(this.start.x, this.current.x),
            maxX = Math.max(this.start.x, this.current.x),
            minY = Math.min(this.start.y, this.current.y),
            maxY = Math.max(this.start.y, this.current.y);

        // Adjust width and xy position of the box element ongoing
        var pos = 'translate(' + minX + 'px,' + minY + 'px)';
        this.box.style.transform = pos;
        this.box.style.WebkitTransform = pos;
        this.box.style.width = maxX - minX + 'px';
        this.box.style.height = maxY - minY + 'px';
    };

    this.onMouseUp = function(e) {
        // Capture xy coordinates
        this.bbox = [this.map.map.unproject(this.start), this.map.map.unproject(this.mousePos(e))];
        this.finish(this.bbox);
    };

    this.enableSelectMode = function() {
        if (!this.inSelectMode()) {
            this.polygonButtonSelected = true;
        }

        var buttonColor = "#dcdee2";
        var opacity = 0.7;

        $(this.associatedButton).animate({
            backgroundColor: buttonColor,
            opacity: opacity
        }, 200);
    };

    this.disableSelectMode = function() {
        if (this.inSelectMode()) {
            this.polygonButtonSelected = false;
        }

        var buttonColor = "white";
        var opacity = 1.0;

        $(this.associatedButton).animate({
            backgroundColor: buttonColor,
            opacity: opacity
        }, 200);

        this.map.map.dragPan.enable();
    };

    this.inSelectMode = function() {
        return this.polygonButtonSelected;
    };

    this.toggleMode = function() {
        if (this.inSelectMode()) {
            this.disableSelectMode();
        } else {
            this.enableSelectMode();
        }

        // reset bounding box
        if (!this.inSelectMode()) {
            this.bbox = null;
            // Remove these events now that finish has been called.
            this.polygonButtonSelected = false;
            this.map.map.dragPan.enable();
        }
    };

    this.onKeyDown = function(e) {
        // If the ESC key is pressed
        var ESCAPE_KEY = 27;
        if (e.keyCode === ESCAPE_KEY) {
            this.disableSelectMode(); // when escape is pressed, exist select mode
            // Capture xy coordinates
            this.bbox = [this.map.map.unproject(this.start), this.map.map.unproject(this.current)];
            this.finish(this.bbox);
        }
    };
    // Set `true` to dispatch the event before other functions
    // call it. This is necessary for disabling the default map
    // dragging behaviour.
    this.mouseDown = function(e) {
        // Continue the rest of the function if the shiftkey is pressed.
        if (!(e.shiftKey && e.button === 0) && !this.polygonButtonSelected) return;
        // box currently being drawn, so don't continue adding callbacks
        // as they are already in place...
        if (this.box) {
            return;
        }
        // Disable default drag zooming when the shift key is held down.
        this.map.map.dragPan.disable();

        // below 3 lines explanation: js rebinds this to something else
        // when called in a call back, this makes sure that this points
        // to our actual object... long story short - makes inheritance work
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        // Call functions for the following events
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('keydown', this.onKeyDown);

        // Capture the first xy coordinates
        this.start = this.mousePos(e);
    };

    this.prepareEventListeners = function() {
        if (!this.canvas) {
            this.canvas = this.map.map.getCanvasContainer()
        }
        this.mouseDown = this.mouseDown.bind(this);
        this.canvas.addEventListener('mousedown', this.mouseDown, true);
    };

    this.removeInternalEventListeners = function() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('keydown', this.onKeyDown);
    };

    this.removeEventListeners = function() {
        this.canvas.removeEventListener('mousedown', this.mouseDown, true);
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

    this.getVerticesOfSquareBbox = function(bbox) {
        // create generic lat long object literals, else jquery has trouble
        // sending over array
        var mapboxPoint1 = bbox[0];
        var mapboxPoint2 = bbox[1];

        var multiplier = 1.2;
        var highestLat, lowestLat, highestLong, lowestLong = 0;

        // get lowest lat and long
        if (mapboxPoint1.lat > mapboxPoint2.lat) {
            highestLat = mapboxPoint1.lat;
            lowestLat = mapboxPoint2.lat;
        } else {
            highestLat = mapboxPoint2.lat;
            lowestLat = mapboxPoint1.lat;
        }

        if (mapboxPoint1.lng > mapboxPoint2.lng) {
            highestLong = mapboxPoint1.lng;
            lowestLong = mapboxPoint2.lng;
        } else {
            highestLong = mapboxPoint2.lng;
            lowestLong = mapboxPoint1.lng;
        }

        var nw = {
            lat: highestLat,
            lng: lowestLong
        };
        var ne = {
            lat: highestLat,
            lng: highestLong
        }
        var se = {
            lat: lowestLat,
            lng: highestLong
        };

        var sw = {
            lat: lowestLat,
            lng: lowestLong
        };

        var vertices = [nw, ne, se, sw];

        return vertices;
    };

    this.setMinMax = function(min, max) {
        this.minIndex = min;
        this.maxIndex = max;
    };

    this.reset = function(area) {
        var dates = propertyToJSON(area.properties.decimal_dates);
        this.minIndex = 0;
        this.maxIndex = dates.length - 1;
    };
}

function RecolorSelector() {}

function setupRecolorSelector() {
    RecolorSelector.prototype.recoloringInProgress = false;
    RecolorSelector.prototype.finish = function(bbox) {
        this.removeInternalEventListeners();

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

        // If bbox exists. use this value as the argument for `queryRenderedFeatures`
        if (bbox) {
            this.recolorDataset();
        }
    };

    RecolorSelector.prototype.recolorOnDisplacement = function(startDecimalDate, endDecimalDate, loadingText) {
        var yearsElapsed = endDecimalDate - startDecimalDate;
        this.recolorDatasetWithBoundingBoxAndMultiplier(null, yearsElapsed, loadingText);
    };

    RecolorSelector.prototype.recolorDatasetWithBoundingBoxAndMultiplier = function(box, multiplier, loadingText) {
        if (this.recoloringInProgress) {
            return;
        }

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
