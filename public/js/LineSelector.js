// subclass of square selector
function LineSelector(map) {
    var that = this;

    this.lineJSON = null;
    this.lineWidth = 100;
    SquareSelector.call(this, map);

    // remove event listener from base constructor calling
    document.removeEventListener("mousedown", that.mouseDown);

    this.setStartPoint = false;
    this.mouseDown = function(e) {
        if (!that.setStartPoint) {
            that.start = that.mousePos(e);
            that.setStartPoint = true;
        } else {
            that.current = that.mousePos(e);
            that.setStartPoint = false;
            var polygonCoordinates = that.getPolygonBbox(that.start, that.current);
            that.finish(polygonCoordinates);
        }
    };

    this.bearingInDegrees = function(start, end) {
        var degToRad = Math.PI / 180.0;

        var phi1 = start.lat * degToRad;
        var phi2 = end.lat * degToRad;
        var lam1 = start.lng * degToRad;
        var lam2 = end.lng * degToRad;


        return Math.atan2(Math.sin(lam2 - lam1) * Math.cos(phi2),
            Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lam2 - lam1)
        ) * 180 / Math.PI;
    };

    this.initialBearing = function(start, end) {
        return (that.bearingInDegrees(start, end) + 360) % 360;
    };

    // this.getLineBoundingBox = function(start, end, offset) {
    //     var RAD_TO_DEG = 180.0 / Math.PI;
    //     var startProjected = that.map.map.project(start);
    //     var endProjected = that.map.map.project(end);

    //     var dy = end.lat - start.lat;
    //     var dx = end.lng - start.lng;

    //     var angle = Math.atan(dx / dy);
    //     angle = (Math.PI / 2.0) - angle;
    //     console.log("dy: " + dy);
    //     console.log("dx: " + dx);
    //     console.log("angle: " + angle * RAD_TO_DEG);

    //     // endProjected.x = endProjected.x + offset * Math.cos(angle);
    //     // endProjected.y = endProjected.y - offset * Math.sin(angle);

    //     var newEnd = that.map.map.unproject(endProjected);

    //     return end;
    // };
    this.getPolygonBbox = function(start, end) {
        var DISTANCE = that.lineWidth; // to be made dynamic

        var RAD_TO_DEG = 180.0 / Math.PI;
        var startPoint = that.map.map.unproject(start);
        var endPoint = that.map.map.unproject(end);

        var dy = endPoint.lat - startPoint.lat;
        var dx = endPoint.lng - startPoint.lng;

        var angle = Math.atan(dx / dy);
       // angle = (Math.PI / 2.0) - angle;
        console.log(start);
        console.log("dy: " + dy);
        console.log("dx: " + dx);
        console.log("angle: " + angle * RAD_TO_DEG);

        var otherStart = [start.x + (DISTANCE * Math.cos(angle)), start.y + (DISTANCE * Math.sin(angle))];
        var otherEnd = [end.x + (DISTANCE * Math.cos(angle)), end.y + (DISTANCE * Math.sin(angle))];
        console.log("cos is : " + Math.cos(angle));
        console.log(start);
        console.log(otherStart);
        var otherStartUnprojected = that.map.map.unproject(otherStart);
        var otherEndUnprojected = that.map.map.unproject(otherEnd);

        var polygonCoordinates = [
            [
                [startPoint.lng, startPoint.lat],
                [endPoint.lng, endPoint.lat],
                [otherEndUnprojected.lng, otherEndUnprojected.lat],
                [otherStartUnprojected.lng, otherStartUnprojected.lat]
            ]
        ]; // no idea why 3D array, just see their api
        // console.log(startPoint.lat + ", " + startPoint.lng);
        // console.log(otherStartLat + ", " + otherStartLong);
        // console.log("----------------");
        // console.log(endPoint.lat + ", " + endPoint.lng);
        // console.log(otherEndLat + ", " + otherEndLong);

        return polygonCoordinates;
    };

    this.bearingToUnitCirlcleAngle = function(bearing) {
        var bearingQuadrants = [
            [0, 90],
            [270, 360],
            [180, 270],
            [90, 180]
        ];

        var bearingQuadrant = 1;

        // get the quadrant we are in
        for (var i = 0; i < bearingQuadrants.length; i++) {
            var curDegrees = bearingQuadrants[i];

            if (bearing >= curDegrees[0] && bearing <= curDegrees[1]) {
                bearingQuadrant = i + 1;
                break;
            }
        }
        console.log("bearing quadrant is " + bearingQuadrant);
        switch (bearingQuadrant) {
            case 1:
                bearing = 90 - bearing;
                break;
            case 2:
                bearing = bearing - 270 + 90;
                break;
            case 3:
                bearing = 270 - bearing + 180;
                break;
            case 4:
                bearing = 180 - bearing + 270;
                break;
            default:
                throw "Error calculating unit circle degrees for bearing " + bearingQuadrant;
        }

        return bearing;
    };

    this.finish = function(bbox) {
        if (that.map.map.getSource("topographyLine")) {
            that.map.map.removeLayer("topographyLine");
            that.map.map.removeSource("topographyLine");
            that.map.map.removeLayer("test");
            that.map.map.removeSource("test");
        }

        that.map.map.addSource('topographyLine', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': bbox
                }
            }
        });

        that.map.map.addLayer({
            'id': 'topographyLine',
            'type': 'fill',
            'source': 'topographyLine',
            'layout': {},
            'paint': {
                'fill-color': '#088',
                'fill-opacity': 0.8
            }
        });

        var test = new mapboxgl.GeoJSONSource();

        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": bbox[0][0]
            },
            "properties": {
                "marker-symbol": "marker"
            }
        };
        var feature2 = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": bbox[0][3]
            },
            "properties": {
                "marker-symbol": "marker"
            }
        };

        test.setData({
            "type": "FeatureCollection",
            "features": [feature, feature2]
        });
        that.map.map.addSource("test", test);

        that.map.map.addLayer({
            "id": "test",
            "type": "symbol",
            "source": "test",
            "layout": {
                "icon-image": "{marker-symbol}-15",
                "icon-allow-overlap": true
            }
        });

        // var features = that.map.map.queryRenderedFeatures(, { layers: that.layers });
    };

    document.addEventListener("mousedown", that.mouseDown);
}

LineSelector.prototype = new SquareSelector(myMap);
