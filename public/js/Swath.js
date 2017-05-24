// TODO: make areamarkerlayer class use swath objects instead of id's
function Swath(map, satellite, width, feature, id) {
    this.map = map;
    this.satellite = satellite;
    this.width = width;
    this.feature = feature;
    this.id = id;
    this.polygonID = this.id + "fill";
    this.color = null;
    this.fillColor = null;

    this.setSwathColor = function(satellite) {
        var swathColors = {
            "TERRASAR-X": "rgba(255, 0, 0, 1.0)",
            "CSK": "rgba(204, 52, 6, 1.0)",
            "ERS": "rgba(146, 191, 63, 1.0)",
            "ENVISAT": "rgba(110, 200, 54, 1.0)",
            "RADARSAT": "rgba(74, 200, 54, 1.0)",
            "RADARSAT-2": "rgba(12, 201, 44, 1.0)",
            "SENTINEL": "rgba(3, 144, 17, 1.0)",
            "ALOS2": "rgba(0, 93, 255, 1.0)",
            "ALOS": "rgba(15, 24, 193, 1.0)"
        };

        var color = swathColors[satellite.toUpperCase()];
        return color ? color : "rgba(0, 0, 255, 1.0)";
    };

    this.remove = function() {
        if (this.map.map.getSource(this.id)) {
            this.map.removeSource(this.id);
            this.map.removeSource(this.polygonID)
        }

        if (this.map.map.getLayer(this.id)) {
            this.map.removeLayer(this.id);
            this.map.removeLayer(this.polygonID);
        }
    };

    this.display = function() {
        var areaMarker = {
            type: "geojson",
            cluster: false,
            clusterRadius: 10,
            data: {}
        };

        // add the markers representing the available areas
        areaMarker.data = {
            "type": "FeatureCollection",
            "features": [this.feature]
        };

        this.remove();

        this.map.addSource(this.id, areaMarker);
        var polygonFeature = {
            "type": "Feature",
            "geometry": this.feature.geometry,
            "properties": this.feature.properties
        };
        polygonFeature.properties["marker-symbol"] = "fillPolygon";
        areaMarker.data = {
            "type": "FeatureCollection",
            "features": [polygonFeature]
        };
        this.map.addSource(this.polygonID, areaMarker);
        // use same properties as the main feature which will be used
        // for the fill layer. We use the id of the corresponding fill layer...
        // allows for only highlighting on frame hover

        this.color = this.setSwathColor(this.satellite);
        this.fillColor = this.color.slice(0, -6) + ", 0.0)";

        if (this.map.map.getLayer("chunk_1")) {
            this.map.addLayer({
                "id": this.id,
                "type": "fill",
                "source": this.id,
                "paint": {
                    "fill-color": this.fillColor,
                    "fill-outline-color": this.color
                }
            }, "chunk_1");
            this.map.addLayer({
                "id": this.polygonID,
                "type": "line",
                "source": this.polygonID,
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": this.color,
                    "line-width": this.width
                }
            }, "chunk_1");
        } else {
            this.map.addLayer({
                "id": this.id,
                "type": "fill",
                "source": this.id,
                "paint": {
                    "fill-color": this.fillColor,
                    "fill-outline-color": this.color
                }
            });
            this.map.addLayer({
                "id": this.polygonID,
                "type": "line",
                "source": this.polygonID,
                "paint": {
                    "line-color": this.color,
                    "line-width": this.width
                }
            });
        }
    };
}
