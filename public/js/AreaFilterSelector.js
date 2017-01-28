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

        $.ajax({
            url: "/WebServices?bbox=" + "BBOX TO BE INSERTED",
            success: function(response) {
                console.log(response);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
            }
        })
    }
}
