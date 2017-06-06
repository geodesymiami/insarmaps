function SquareSelector() {
    var that = this;
    this.map = null;
    this.minIndex = -1;
    this.maxIndex = -1;
    this.lastMinIndex = -1;
    this.lastMaxIndex = -1;
    this.bbox = null; // nw and se points array
    this.lastbbox = null;
    this.associatedButton = null;
    this.cancelRecoloring = false;
    this.cancellableAjax = new CancellableAjax();

    this.canvas = null;
    this.polygonButtonSelected = false;
    this.selectingInProgress = false;

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
        this.removeMouseListeners();
        // Capture xy coordinates
        this.bbox = [this.map.map.unproject(this.start), this.map.map.unproject(this.mousePos(e))];
        this.selectingInProgress = false;
        this.finish(this.bbox);
    };

    this.selecting = function() {
        return this.selectingInProgress;
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

        this.selectingInProgress = false;

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
        this.cancelRecoloring = false;
        // Disable default drag zooming when the shift key is held down.
        this.map.map.dragPan.disable();

        // below 3 lines explanation: js rebinds this to something else
        // when called in a call back, this makes sure that this points
        // to our actual object... long story short - makes inheritance work
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        // Call functions for the following events
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        this.selectingInProgress = true;

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

    this.removeMouseListeners = function() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
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

    this.squareBboxToMapboxPolygon = function(bbox) {
        var vertices = this.getVerticesOfSquareBbox(bbox);
        var nw = vertices[0];
        var ne = vertices[1];
        var se = vertices[2];
        var sw = vertices[3];

        var polygon = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [nw.lng, nw.lat],
                        [ne.lng, ne.lat],
                        [se.lng, se.lat],
                        [sw.lng, sw.lat],
                        [nw.lng, nw.lat]
                    ]
                ]
            }
        };

        return polygon;
    };

    this.verticesOfBboxToLineString = function(polygonVertices) {
        var serverBboxCoords = ""
        var buffer = 0; // REMOVE POTENTIALLY
        for (var i = 0; i < polygonVertices.length; i++) {
            switch (i) {
                case 0: // nw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 1: // ne
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 2: // se
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 3: // sw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                default:
                    throw "invalid counter";
                    break;
            }
        }
        // add initial vertext again to close linestring
        serverBboxCoords += polygonVertices[0].lng + " " + polygonVertices[0].lat;

        return "LINESTRING(" + serverBboxCoords + ")";
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

    // mapbox gives us duplicate tiles (see documentation to see how query rendered features works)
    // yet we only want unique features, not duplicates
    this.getUniqueFeatures = function(features) {
        var featuresMap = [];
        var uniqueFeatures = [];

        for (var i = 0; i < features.length; i++) {
            var curFeatureKey = JSON.stringify(features[i].geometry.coordinates);
            if (!featuresMap[curFeatureKey]) {
                featuresMap[curFeatureKey] = true;
                uniqueFeatures.push(features[i]);
            }
        }

        return uniqueFeatures;
    };
}
