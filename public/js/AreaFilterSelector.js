// subclass of SquareSelector
function AreaFilterSelector() {}

// needed because need to setup these methods after the map and its canvas load
// and don't want to include these methods in the main page load callback in
// mainPage.js... this wouldn't be necessary if we loaded the map in the global scope
// rather than on full load of the page...
function setUpAreaFilterSelector() {
    AreaFilterSelector.prototype.finish = function(bbox) {
        this.removeEventListeners();
        if (this.box) {
            this.box.parentNode.removeChild(this.box);
            this.box = null;
        }

        var polygonVertices = this.getVerticesOfSquareBbox(bbox);
        var serverBboxCoords = ""
        var bboxString = "LINESTRING()";
        var buffer = 0; // REMOVE POTENTIALLY
        for (var i = 0; i < polygonVertices.length; i++) {
            switch (i) {
                case 0: // nw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " +  polygonVertices[i].lat + ",";
                    break;
                case 1: // ne
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " +  polygonVertices[i].lat + ",";
                    break;
                case 2: // se
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " +  polygonVertices[i].lat + ",";
                    break;
                case 3: // sw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " +  polygonVertices[i].lat + ",";
                    break;
                default:
                    throw "invalid counter";
                    break;
            }
        }
         // add initial vertext again to close linestring
         serverBboxCoords += polygonVertices[0].lng + " " +  polygonVertices[0].lat;
         console.log(serverBboxCoords);

        $.ajax({
            url: "/WebServices?box=LINESTRING(" + serverBboxCoords + ")",
            success: function(response) {
                console.log(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
            }
        })
    }
}
