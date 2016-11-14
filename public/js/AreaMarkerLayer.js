// abstract multiple area marker layers into one master layer object
function AreaMarkerLayer(map) {
    var that = this;

    this.layers = [];
    this.modifiedLayers = [];
    this.map = map;

    this.addLayer = function(id) {
        this.layers.push(id);
    };

    this.resetSizeOfMarkersExcluding = function(toExclude) {
        for (var i = 0; i < that.layers.length; i++) {
            var layerID = that.layers[i];

            if (toExclude != null && toExclude.indexOf(layerID) != -1) {
                continue;
            }

            that.map.map.setLayoutProperty(layerID, "icon-size", 1);
        }
    };

    this.resetSizeOfMarkers = function() {
        that.resetSizeOfMarkersExcluding(null);
    };

    this.resetSizeOfModifiedMarkers = function() {
        for (var i = 0; i < that.modifiedLayers.length; i++) {
            var layerID = that.modifiedLayers[i];

            that.map.map.setLayoutProperty(layerID, "icon-size", 1);
        }

        that.modifiedLayers = [];
    };

    this.setMarkerSize = function(marker, size) {
        that.map.map.setLayoutProperty(marker, "icon-size", size);

        // if not previously marked as modified, mark as modified
        if (that.modifiedLayers.indexOf(marker) == -1) {
            that.modifiedLayers.push(marker);
        }
    };
}
