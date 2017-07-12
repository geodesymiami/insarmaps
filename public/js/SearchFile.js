// TODO: if these two functions too slow, keep a hash map when load area
// of all possible attributes for speed. this is horribly inefficient now...
function populateSearchDataList(inputID, areas, attribute) {
    var id = "#" + inputID;
    var $input = $(id);

    var attributesSeenAlready = [];
    var attributes = [];

    // if no areas, simply populate an empty list. this is to avoid exception
    // when user initially clicks but autocomplete hasn't been initialize. thus,
    // we initialize to empty list when areas is null (on initial page load)
    if (areas) {
        var attributesController = new AreaAttributesController(myMap, areas[0]);
        for (var i = 0; i < areas.length; i++) {
            attributesController.setArea(areas[i]);
            var fileAttributes = attributesController.getAllAttributes();
            var attributeValue = fileAttributes[attribute];

            if (!attributesSeenAlready[attributeValue]) {
                attributesSeenAlready[attributeValue] = true;
                attributes.push(attributeValue);
            }
        }
    }

    $input.autocomplete({
        minLength: 0,
        source: attributes
    });
}

function populateSearchAutocomplete() {
    populateSearchDataList("input-satellite", myMap.areaFeatures, "mission");
    populateSearchDataList("input-mode", myMap.areaFeatures, "beam_mode");
    populateSearchDataList("input-flight-direction", myMap.areaFeatures, "flight_direction");
}

function hideAllAutomcompleteSuggestions() {
    $("#input-satellite").autocomplete("close");
    $("#input-mode").autocomplete("close");
    $("#input-flight-direction").autocomplete("close");
}

function hideAllSearchBars() {
    var container = $("#hidden-search-bars-container");
    $("#search-form input").val("");
    if (container.hasClass("active")) {
        container.removeClass("active");
    }
}

function fullyHideSearchBars() {
    hideAllSearchBars();
    hideAllAutomcompleteSuggestions();
}

function searchTableHoverIn(jQueryThis) {
    if (myMap.pointsLoaded()) {
        return;
    }

    $(jQueryThis).css({ "background-color": "rgba(0, 86, 173, 0.5)" });
    var className = $(jQueryThis).attr("class");
    if (className) {
        var layerID = "swath-area-" + className.split("-search")[0];
        myMap.areaMarkerLayer.setPolygonHighlighted(layerID, "rgba(0, 0, 255, 0.3)");
    }
}

function searchTableHoverOut(jQueryThis) {
    if (!currentArea || $(jQueryThis).attr("id") != currentArea.properties.layerID + "-search-row") {
        $(jQueryThis).css({ "background-color": "white" });
    }
    myMap.areaMarkerLayer.resetHighlightsOfAllMarkers();
}

function SearchFormController(container) {
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
        // twice because it first_frame is sometimes called frame in db
        attributes["frame"] = $("#input-first-frame").val();
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
    };

    this.populateSubsetPopup = function(mainFeature, subsetFeatures) {
        $(".show-children-button#" + mainFeature.properties.unavco_name).hover(function(e) {
            e.stopPropagation(); // don't trigger hover event of parent

            $subsetSwathTableBody = $("#subset-swath-table > tbody").empty();
            var attributesController = new AreaAttributesController(myMap, mainFeature);
            var $subsetSwathPopup = $("#subset-swath-popup");
            if (!$subsetSwathPopup.hasClass("active")) {
                $subsetSwathPopup.addClass("active");
                var rowCoords = $(this).offset();
                var subsetLeft = rowCoords.left + $(this).width();
                var $map = $("#map-container");
                var mapBottom = $map.offset().top + $map.height();
                var subsetTop = rowCoords.top - $(this).position().top;

                if ((subsetTop + $subsetSwathPopup.height()) > mapBottom) {
                    subsetTop = subsetTop - $subsetSwathPopup.height() + $(this).height();
                }
                $subsetSwathPopup.css({ top: subsetTop, left: subsetLeft });
            }

            subsetFeatures.forEach(function(subsetFeature) {
                var rowClass = subsetFeature.properties.unavco_name + "-search-row";
                var attributes = attributesController.getAllAttributes();
                var html = "<tr class='" + rowClass + "'>";
                html += "<td>" + attributes.first_date + "</td>";
                html += "<td>" + attributes.last_date + "</td>";
                html += "<td>" + attributes.unavco_name + "</td>";
                html += "</tr>";
                $subsetSwathTableBody.append(html);

                $("." + rowClass).css({ cursor: "pointer" });
                $("." + rowClass).click(function() {
                    if (!currentArea || (subsetFeature.properties.layerID != currentArea.properties.layerID) && !myMap.pointsLoaded()) {
                        myMap.loadDataSetFromFeature(subsetFeature);
                    }
                });
            });

            var $tr = $("#subset-swath-table > tbody tr");
            $tr.css({ cursor: "pointer" });
            // make search form table highlight on hover
            $tr.hover(function() {
                if (!SearchFormController.loadedSubsets) {
                    myMap.addSubsetSwaths(mainFeature, false);
                    SearchFormController.loadedSubsets = true;
                }

                searchTableHoverIn(this);
            }, function() {
                searchTableHoverOut(this);
            });
        });
    };

    /**
     * Given dictionary of attributes, generate HTML row displaying dataset with those attributes
     * @param {Array} fileAttributes - if user inputs at least one search criteria, null otherwise
     */
    this.generateMatchingAreaHTML = function(area) {

        var attributesController = new AreaAttributesController(myMap, area);
        fileAttributes = attributesController.getAllAttributes();
        var satellite = fileAttributes.mission;
        var relative_orbit = fileAttributes.relative_orbit;
        var first_frame = fileAttributes.first_frame ? fileAttributes.first_frame : fileAttributes.frame;
        first_frame = first_frame.toString() != "0" ? first_frame : "N/A";
        var mode = fileAttributes.beam_mode;
        var flight_direction = fileAttributes.flight_direction;
        var unavco_name = area.properties.unavco_name;
        var rowClass = unavco_name + "-search-row";
        var html = "<tr class='" + rowClass + "'><td>" + satellite + "</td><td>" + relative_orbit + "</td><td>" +
            first_frame + "</td><td>" + mode + "</td><td>" + flight_direction + "</td></tr>";

        var subsetFeatures = myMap.getSubsetFeatures(area);
        var haveSubsets = subsetFeatures && subsetFeatures.length > 1;
        if (haveSubsets) {
            html = "<tr class='" + rowClass + "' class='have-subsets'><td>" + satellite + "</td><td>" + relative_orbit + "</td><td>" +
                first_frame + "</td><td>" + mode + "</td><td><div class='flight-direction'>" + flight_direction +
                "</div><div class='show-children-button caret' id='" + unavco_name + "'></div></td></tr>";
        }

        $("#search-form-results-table tbody").append(html);
        $("." + rowClass).css({ cursor: "pointer" });
        $("." + rowClass).click(function() {
            if (!currentArea || (area.properties.layerID != currentArea.properties.layerID) && !myMap.pointsLoaded()) {
                myMap.loadDataSetFromFeature(area);
            }
        });

        if (haveSubsets) {
            this.populateSubsetPopup(area, subsetFeatures);
        }
    };

    this.makeTableRowsInteractive = function() {
        $("#search-form-results-table tr").hover(function(e) {
            var $subsetSwathPopup = $("#subset-swath-popup");
            if ($subsetSwathPopup.hasClass("active")) {
                $subsetSwathPopup.removeClass("active");
            }

            if (SearchFormController.loadedSubsets) {
                myMap.loadSwathsInCurrentViewport(false);
                SearchFormController.loadedSubsets = false;
            }
            searchTableHoverIn(this);
        }, function() {
            searchTableHoverOut(this);
        });

        $("#search-form-results-table").trigger("update");
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
        var areas = myMap.allAreaFeatures;
        var attributesController = new AreaAttributesController(myMap, areas[0]);
        var fileAttributes = null;
        var attributesMatch = true;

        // for each area, get attributes
        for (var i = 0; i < areas.length; i++) {
            attributesController.setArea(areas[i]);
            fileAttributes = attributesController.getAllAttributes();
            attributesMatch = true;

            if (recentDatasetsToggleButton.toggleState == ToggleStates.ON) {
                var areaDate = new Date(fileAttributes.last_date);
                var millisecondsInYear = 1000 * 60 * 60 * 24 * 365;
                var timeDifference = (new Date() - areaDate) / millisecondsInYear;
                // dataset last_date older than a year, don't include it (i.e., don't even search it)
                if (timeDifference > 1.0) {
                    continue;
                }
            }

            // for each attribute inputted by user, compare to attribute of same name in area
            // if attribute values do not match, break
            for (var key in searchAttributes) {
                var attribute = fileAttributes[key];
                if (attribute && attribute.toLowerCase() != searchAttributes[key].toLowerCase()) {
                    attributesMatch = false;
                    break;
                }
            }
            // if all attributes match, add area to array matchingAreas and generate HTML row displaying that area's attributes
            if (attributesMatch) {
                matchingAreas.push(areas[i]);
                this.generateMatchingAreaHTML(areas[i]);
            }
        }

        this.makeTableRowsInteractive();

        return matchingAreas;
    };

    this.populateSearchResultsTable = function(features) {
        $("#search-form-results-table tbody").empty();
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            this.generateMatchingAreaHTML(feature);
        }

        this.makeTableRowsInteractive();
    };
}

// static variable
SearchFormController.loadedSubsets = false;

$(window).on("load", function() {
    var searcher = new SearchFormController("search-form");

    document.addEventListener("keydown", function(e) {
        const ENTER_KEY = 13;

        // enter key, and focus on one of the inputs, and main top search input isn't empty
        if (e.keyCode === ENTER_KEY && ($("#search-form input").is(":focus"))
            && (!$("#search-input").val())) {
            if (myMap.areaFeatures) {
                searcher.search();
                $("#search-form-and-results-maximize-button").click();
                fullyHideSearchBars();
            }
        }
    });

    $("#enter-button-search-attributes").click(function() {
        searcher.search();
        $("#search-form-and-results-maximize-button").click();
    });
});
