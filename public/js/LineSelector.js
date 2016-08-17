// subclass of square selector
function LineSelector(map) {
    var that = this;
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

    this.finish = function(bbox) {
        if (that.map.map.getSource("topographyLine")) {
            that.map.map.removeLayer("topographyLine");
            that.map.map.removeSource("topographyLine");
        }

        var line = new mapboxgl.GeoJSONSource();
        var startPoint = that.map.map.unproject(bbox[0]);
        var endPoint = that.map.map.unproject(bbox[1]);

        line.setData({
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [startPoint.lng, startPoint.lat],
                    [endPoint.lng, endPoint.lat]
                ]
            }
        });

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
                "line-width": 8
            }
        });
    };

    document.addEventListener("mousedown", that.mouseDown);    
}

LineSelector.prototype = new SquareSelector(myMap);
