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
        for (var i = 0; i < this.layers.length; i++) {
            var layerID = this.layers[i];

            if (toExclude != null && toExclude.indexOf(layerID) != -1) {
                continue;
            }

            this.map.map.setLayoutProperty(layerID, "icon-size", 1);
        }
    };

    this.resetSizeOfMarkers = function() {
        this.resetSizeOfMarkersExcluding(null);
    };

    this.resetSizeOfModifiedMarkers = function() {
        // if we ever revert to area markers instead of polygons
        // change this code to use setMarkerSize function instead of
        // calling setLayoutProperty
        for (var i = 0; i < this.modifiedLayers.length; i++) {
            var layerID = this.modifiedLayers[i];

            this.map.map.setLayoutProperty(layerID, "icon-size", 1);
        }

        this.modifiedLayers = [];
    };

    this.setMarkerSize = function(marker, size) {
        this.map.map.setLayoutProperty(marker, "icon-size", size);

        // if not previously marked as modified, mark as modified
        if (this.modifiedLayers.indexOf(marker) == -1) {
            this.modifiedLayers.push(marker);
        }
    };

    this.setAreaRowHighlighted = function(row) {
        var $row = $("#" + row + "-search-row");
        var rowColor = "rgba(0, 86, 173, 0.5)"
        if (!$row.hasClass("highlighted")) {
            $row.addClass("highlighted");
            $row.css({ "background-color":  rowColor});
        }
        // now scroll to it, maybe pass in container div as parameter?
        var position = $row.position();
        $(".fixed-header-table-container").scrollTop(position.top);
    };

    this.resetHighlightsOfAllAreaRows = function(excluding) {
        if (excluding) {
            this.setAreaRowHighlighted(excluding.properties.layerID);
        }

        $("#search-form-results-table tr").each(function() {
            if (!excluding || $(this).attr("id") != excluding.properties.layerID + "-search-row") {
               $(this).css({ "background-color": "white"});
               $(this).removeClass("highlighted");
            }
        });
    };

    this.setPolygonHighlighted = function(marker, highlightColor) {
        if (this.map.map.getLayer(marker)) {
            this.map.map.setPaintProperty(marker, "fill-color", highlightColor);

            // if not previously marked as modified, mark as modified
            if (this.modifiedLayers.indexOf(marker) == -1) {
                this.modifiedLayers.push(marker);
            }
        }
    };

    this.resetHighlightsOfAllMarkers = function() {
        for (var i = 0; i < this.modifiedLayers.length; i++) {
            var layerID = this.modifiedLayers[i];

            this.setPolygonHighlighted(layerID, "rgba(0, 0, 255, 0)");
        }

        this.modifiedLayers = [];
    };
}
