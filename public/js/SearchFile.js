// TODO: if these two functions too slow, keep a hash map when load area
// of all possible attributes for speed. this is horribly inefficient now...
function populateSearchDataList(dataListID, areas, attribute) {
    var id = "#" + dataListID;
    var datalistObj = $(id);

    var attributesController = new AreaAttributesController(myMap, areas[0]);

    var attributesSeenAlready = [];
    // empty it just in case
    datalistObj.empty();
    for (var i = 0; i < areas.length; i++) {
        attributesController.setArea(areas[i]);
        var fileAttributes = attributesController.getAllAttributes();
        var attributeValue = fileAttributes[attribute];

        if (!attributesSeenAlready[attributeValue]) {
            attributesSeenAlready[attributeValue] = true;
            datalistObj.append("<option value='" + attributeValue + "'>")
        }
    }
}

function populateSearchDatalists() {
    populateSearchDataList("satellites-list", myMap.areaFeatures, "mission");
    populateSearchDataList("modes-list", myMap.areaFeatures, "beam_mode");
    populateSearchDataList("flight-direction-list", myMap.areaFeatures, "flight_direction");
}

function searchTableHoverIn(jQueryThis) {
    $(jQueryThis).css({ "background-color": "rgba(0, 86, 173, 0.5)" });
    var id = $(jQueryThis).attr("id");
    if (id) {
        var layerID = id.split("-search-row")[0];
        myMap.areaMarkerLayer.setPolygonHighlighted(layerID, "rgba(0, 0, 255, 0.3)");
    }
}

function searchTableHoverOut(jQueryThis) {
    $(jQueryThis).css({ "background-color": "white" });
    myMap.areaMarkerLayer.resetHighlightsOfAllMarkers();
}

function SearchFile(container) {
    this.container = container;

    /**
     * Return a dictionary containing unavco attribute names and values converted from user input on main page
     * @return {Array} searchAttributesif dictionary if user inputs search criteria, null otherwise
     */
    this.getSearchAttributes = function() {

        var attributes = {}; // dictionary of all attributes
        var searchAttributes = {}; // dictionary of attributes specificied by user to search datasets by
        var numSearchAttributes = 0; // counter to track how many attributes user specified in search

        // Input name -> Unavco name:
        // input-satellite -> mission, input-relative-orbit -> relative_orbit, input-first-frame -> first_frame,
        // input-mode -> beam_mode, flight-direction -> flight_direction

        // * NOTE: If we need to search for more attributes, add them here and make matching buttons in map.blade.php
        attributes["mission"] = $("#input-satellite").val();
        attributes["relative_orbit"] = $("#input-relative-orbit").val();
        attributes["first_frame"] = $("#input-first-frame").val();
        attributes["beam_mode"] = $("#input-mode").val();
        attributes["flight_direction"] = $("#input-flight-direction").val();

        // check attributes dictionary for non-null values and add them to searchAttributes dictionary
        for (var key in attributes) {
            if (attributes[key].length != 0) {
                numSearchAttributes++;
                searchAttributes[key] = attributes[key]
            }
        }

        // return null if user inputs no attributes to search by and we get empty dictionary
        if (numSearchAttributes == 0) {
            return null;
        }

        return searchAttributes;
    }

    /**
     * Given dictionary of attributes, generate HTML row displaying dataset with those attributes
     * @param {Array} fileAttributes - if user inputs at least one search criteria, null otherwise
     */
    this.generateMatchingAreaHTML = function(fileAttributes, area) {

        var satellite = fileAttributes.mission;
        var relative_orbit = fileAttributes.relative_orbit;
        var first_frame = fileAttributes.first_frame;
        first_frame = first_frame.toString() != "0" ? first_frame : "N/A";
        var mode = fileAttributes.beam_mode;
        var flight_direction = fileAttributes.flight_direction;
        var rowID = area.properties.layerID + "-search-row";
        var html = "<tr id='" + rowID + "'><td>" + satellite + "</td><td>" + relative_orbit + "</td><td>" + first_frame + "</td><td>" + mode + "</td><td>" + flight_direction + "</td></tr>";
        $("#search-form-results-table tbody").append(html);
        $("#" + rowID).css({ cursor: "pointer" });
        $("#" + rowID).click(function() {
            if (!currentArea || area.properties.layerID != currentArea.properties.layerID) {
                getGEOJSON(area);
            }
        });
    };

    this.search = function() {
        $("#search-form-results-table tbody").empty();
        var matchingAreas = [];

        // special case if user inputs no attributes to search by, we get null instead of a dictionary
        var searchAttributes = this.getSearchAttributes();
        if (searchAttributes == null) {
            alert("Please enter parameters before searching for a dataset");
            return;
        }

        // get array of all areas on map
        var attributesController = new AreaAttributesController(myMap, myMap.areaFeatures[0]);
        var areas = myMap.areaFeatures;
        var fileAttributes = null;
        var attributesMatch = null;

        // for each area, get attributes
        for (var i = 0; i < areas.length; i++) {
            attributesController.setArea(areas[i]);
            fileAttributes = attributesController.getAllAttributes();
            attributesMatch = true;

            // for each attribute inputted by user, compare to attribute of same name in area
            // if attribute values do not match, break
            for (var key in searchAttributes) {
                if (fileAttributes[key].toLowerCase() != searchAttributes[key].toLowerCase()) {
                    attributesMatch = false;
                    break;
                }
            }
            // if all attributes match, add area to array matchingAreas and generate HTML row displaying that area's attributes
            if (attributesMatch) {
                matchingAreas.push(areas[i]);
                this.generateMatchingAreaHTML(fileAttributes, areas[i]);
            }
        }

        $("#search-form-results-table tr").hover(function() {
            searchTableHoverIn(this);
        }, function() {
            searchTableHoverOut(this);
        });

        $("#search-form-results-table").trigger("update");

        return matchingAreas;
    };
}

$(window).load(function() {
    var searcher = new SearchFile("search-form");

    document.addEventListener("keydown", function(e) {
        var ENTER_KEY = 13;

        if (e.keyCode === ENTER_KEY && !$("#search-input").is(":focus")) {
            searcher.search();
        }
    });

    $("#enter-button-search-attributes").click(function() {
        searcher.search();
    });
});
