// subclass of square selector
function LineSelector(map) {
    var that = this;

    this.lineJSON = null;
    this.lineWidth = 2;
    this.polygonVertices = null;

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

    this.getPolygonBbox = function(start, end) {
        var DISTANCE = that.lineWidth; // to be made dynamic

        var RAD_TO_DEG = 180.0 / Math.PI;
        var startPoint = that.map.map.unproject(start);
        var endPoint = that.map.map.unproject(end);

        var dy = endPoint.lat - startPoint.lat;
        var dx = endPoint.lng - startPoint.lng;

        var angle = Math.atan(dx / dy);

        var otherStart = [start.x + (DISTANCE * Math.cos(angle)), start.y + (DISTANCE * Math.sin(angle))];
        var otherEnd = [end.x + (DISTANCE * Math.cos(angle)), end.y + (DISTANCE * Math.sin(angle))];
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

        that.polygonVertices = polygonCoordinates;

        return polygonCoordinates;
    };

    // see: http://www.movable-type.co.uk/scripts/latlong.html
    // we get the distance in meters, as we really don't care
    this.getDistanceBetweenPoints = function(fromPoint, toPoint) {
        var DEG_TO_RAD = Math.PI / 180.0;
        var R = 6371e3;
        var phi1 = fromPoint.lat * DEG_TO_RAD;
        var phi2 = toPoint.lat * DEG_TO_RAD;
        var dPhi = (toPoint.lat - fromPoint.lat) * DEG_TO_RAD;
        var dLambda = (toPoint.lng - fromPoint.lng) * DEG_TO_RAD;

        var a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var distance = R * c;

        return distance;
    };

    this.getPointsInPolygon = function(polygonVertices) {
        var features = that.map.map.queryRenderedFeatures();
        var featuresInPolygon = [];

        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var featureCoordinates = feature.geometry.coordinates;

            if (that.pointInPolygon(polygonVertices, featureCoordinates)) {
                featuresInPolygon.push(feature);
            }
        }

        return featuresInPolygon;
    };

    this.finish = function(bbox) {
        if (that.map.map.getSource("topographyLine")) {
            that.map.map.removeLayer("topographyLine");
            that.map.map.removeSource("topographyLine");
        }

        if (that.map.map.getSource("test")) {
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
        var selectedFeatures = that.getPointsInPolygon(that.polygonVertices[0]);
        var googleFetcher = new GoogleElevationChunkedQuerier({
            onDone: function(results) {
                var elevations = [];
                // extract elevations into one array for HighCharts
                for (var i = 0; i < results.length; i++) {
                    for (var j = 0; j < results[i].length; j++) {
                        elevations.push(results[i][j].elevation);
                    }
                }



                console.log(selectedFeatures);
            }
        });
        var topography = googleFetcher.getTopographyFromGoogle(selectedFeatures);
    };

    document.addEventListener("mousedown", that.mouseDown);
}

LineSelector.prototype = new SquareSelector(myMap);
