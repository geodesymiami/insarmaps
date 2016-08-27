// subclass of square selector
function LineSelector(map) {
    var that = this;

    this.lineJSON = null;
    this.lineWidth = 100;
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
        var test = new mapboxgl.GeoJSONSource();
        var features = [];

        for (var i = 0; i < selectedFeatures.length; i++) {
            var long = selectedFeatures[i].geometry.coordinates[0];
            var lat = selectedFeatures[i].geometry.coordinates[1];

            features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [long, lat]
                }                
            });
        }       

        test.setData({
            "type": "FeatureCollection",
            "features": features
        });
        that.map.map.addSource("test", test);

        that.map.map.addLayer({
            "id": "test",
            "type": "circle",
            "source": "test",
            "paint": {
                "circle-color": "black"
            }
        });
    };

    document.addEventListener("mousedown", that.mouseDown);
}

LineSelector.prototype = new SquareSelector(myMap);
