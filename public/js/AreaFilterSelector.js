// subclass of SquareSelector
function AreaFilterSelector() {}

// needed because need to setup these methods after the map and its canvas load
// and don't want to include these methods in the main page load callback in
// mainPage.js... this wouldn't be necessary if we loaded the map in the global scope
// rather than on full load of the page...
function setUpAreaFilterSelector() {
    AreaFilterSelector.prototype.finish = function(bbox) {
        this.removeMouseListeners();
        if (this.box) {
            this.box.parentNode.removeChild(this.box);
            this.box = null;
        }

        var polygonVertices = this.getVerticesOfSquareBbox(bbox);
        var serverBboxCoords = this.verticesOfBboxToLineString(polygonVertices);

        // TODO: refactor success function and loadareamarkers handler
        // to not repeat code
        if (this.lastAjaxRequest) {
            this.lastAjaxRequest.abort();
        }

        this.lastAjaxRequest = $.ajax({
            url: "/WebServicesBox?box=" + serverBboxCoords,
            success: function(response) {
                var json = JSON.parse(response);
                if (json.areas.length == 0) {
                    return;
                }

                $("#search-form-results-table tbody").empty();

                myMap.removeAreaMarkers();
                var exclude = currentArea ? [currentArea.properties.unavco_name] : null
                myMap.addSwathsFromJSON(json, exclude);
                this.lastAjaxRequest = null;
            }.bind(this),
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
                this.lastAjaxRequest = null;
            }.bind(this)
        });
    };

    AreaFilterSelector.prototype.filterAreas = function(bbox) {
        this.finish(bbox);
    };

    AreaFilterSelector.prototype.filterAreasInBrowser = function(bbox) {
        var polygon = this.squareBboxToMapboxPolygon(bbox);
        var searchWithin = {
            "type": "FeatureCollection",
            "features": [polygon]
        };
        var points = {
            "type": "FeatureCollection",
            "features": this.map.areas.areas
        };

        var ptsWithin = turf.within(points, searchWithin);
        if (ptsWithin.features.length > 0) {
            var json = {
                "areas": ptsWithin.features
            };
            var filter = currentArea ? [currentArea.properties.unavco_name] : null;

            this.map.addSwathsFromJSON(json, filter);
        }
    };
}
