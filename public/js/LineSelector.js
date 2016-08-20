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

            that.finish([that.start, that.current]);
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

    this.getLineBoundingBox = function(start, end, offset) {
        var startProjected = that.map.map.project(start);
        var endProjected = that.map.map.project(end);

       

    };

    this.bearingToUnitCirlcleAngle = function(bearing) {
        var bearingQuadrants =[[0, 90], [270, 360], [180, 270], [90, 180]];

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

        var line = new mapboxgl.GeoJSONSource();
        var startPoint = that.map.map.unproject(bbox[0]);
        var endPoint = that.map.map.unproject(bbox[1]);

        that.lineJSON = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [startPoint.lng, startPoint.lat],
                    [endPoint.lng, endPoint.lat]
                ]
            }
        };

        line.setData(that.lineJSON);

        that.map.map.addSource('topographyLine', line);

        that.map.map.addLayer({
            "id": "topographyLine",
            "type": "line",
            "source": "topographyLine",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#000",
                "line-width": that.lineWidth
            }
        });

        var bearing = that.initialBearing(startPoint, endPoint);
        console.log("bearing is " + bearing);
        
        var unitDegrees = that.bearingToUnitCirlcleAngle(bearing);
        console.log("unit circle degrees is " + unitDegrees);

        var pointCoords = that.getLineBoundingBox(startPoint, endPoint, that.lineWidth);
        var test = new mapboxgl.GeoJSONSource();

        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [pointCoords.lng, pointCoords.lat]
            },
            "properties": {
                "marker-symbol": "marker"
            }
        };

        test.setData({
            "type": "FeatureCollection",
            "features": [feature]
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
