// subclass of square selector
function LineSelector(map) {
    var that = this;
    SquareSelector.call(this, map);
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
    /* courtesy: https://software.intel.com/en-us/blogs/2012/11/30/calculating-a-bearing-between-points-in-location-aware-apps */
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

    this.getPolygonBbox = function(start, end) {
        var DISTANCE = 2; // to be made dynamic

        var startPoint = that.map.map.unproject(start);
        var endPoint = that.map.map.unproject(end);

        var bearing = that.bearingInDegrees(startPoint, endPoint);
        console.log("bearing: " + bearing);
        console.log("sin: " + Math.sin(bearing));
        console.log("cos: " + Math.cos(bearing));
        var otherStartLong = startPoint.lng - (DISTANCE * Math.cos(bearing));
        var otherStartLat = startPoint.lat - (DISTANCE * Math.sin(bearing));
        var otherEndLong = endPoint.lng - (DISTANCE * Math.cos(bearing));
        var otherEndLat = endPoint.lat - (DISTANCE * Math.sin(bearing));
        var polygonCoordinates = [
            [
                [startPoint.lng, startPoint.lat],
                [endPoint.lng, endPoint.lat],
                [otherEndLong, otherEndLat],
                [otherStartLong, otherStartLat]
            ]
        ]; // no idea why 3D array, just see their api
        console.log(startPoint.lat + ", " + startPoint.lng);
        console.log(otherStartLat + ", " + otherStartLong);
        console.log("----------------");
        console.log(endPoint.lat + ", " + endPoint.lng);
        console.log(otherEndLat + ", " + otherEndLong);

        return polygonCoordinates;
    };

    this.finish = function(bbox) {
    	if (that.map.map.getSource("topographyLine")) {
    		that.map.map.removeLayer("topographyLine");
    		that.map.map.removeSource("topographyLine");
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
    };

    document.addEventListener("mousedown", that.mouseDown);
}

LineSelector.prototype = new SquareSelector(myMap);
