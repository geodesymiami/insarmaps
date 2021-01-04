// TODO: if these two functions too slow, keep a hash map when load area
// of all possible attributes for speed. this is horribly inefficient now...
function populateAutocompleteFromFeatures(inputID, areas, attribute) {
    var id = "#" + inputID;
    var $input = $(id);

    var attributesSeenAlready = [];
    var attributes = [];

    // if no areas, simply populate an empty list. this is to avoid exception
    // when user initially clicks but autocomplete hasn't been initialize. thus,
    // we initialize to empty list when areas is null (on initial page load)
    if (areas) {
        var attributesController = new AreaAttributesController(null, areas[0]);
        for (var i = 0; i < areas.length; i++) {
            attributesController.setArea(areas[i]);
            var areaAttributes = attributesController.getAllAttributes();
            var attributeValue = areaAttributes[attribute];

            if (attributeValue && !attributesSeenAlready[attributeValue]) {
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
    populateAutocompleteFromFeatures("input-satellite", myMap.areas, "mission");
    populateAutocompleteFromFeatures("input-mode", myMap.areas, "beam_mode");
    populateAutocompleteFromFeatures("input-flight-direction", myMap.areas, "flight_direction");
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
    if ($("#dataset-frames-toggle-button").hasClass("toggled")) {
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
    if (!currentArea || $(jQueryThis).attr("class").split(" highlighted")[0] != currentArea.properties.unavco_name + "-search-row") {
        $(jQueryThis).css({ "background-color": "white" });
        $(jQueryThis).removeClass("highlighted");
    }
    myMap.areaMarkerLayer.resetHighlightsOfAllMarkers();
}

// function which handles fuzzy search of main search input(the one always visible). it also is smart enough
// to recognize countries, etc. not sure why it is a singular function and not in the class
function search() {
    var areas = myMap.allAreas;

    if (!$('.wrap#select-area-wrap').hasClass('active')) {
        $('.wrap#select-area-wrap').toggleClass('active');
    }
    if (areas != null) {
        // TODO: dummy search for paper, add actual paper later on when we get attribute
        query = $("#search-input").val();
        var geocoder = new CountryGeocoder(mapboxgl.accessToken);
        geocoder.geocode(query, function(features) {
            if (features.length > 0) {
                var firstCountry = features[0];
                var swCorner = [firstCountry.bbox[0], firstCountry.bbox[1]];
                var neCorner = [firstCountry.bbox[2], firstCountry.bbox[3]];
                var bbox = [swCorner, neCorner];
                myMap.map.fitBounds(bbox);
            }
        });

        for (var i = 0; i < areas.length; i++) {
            // add mission so it's fuse searchable
            areas[i].properties.mission = areas[i].properties.attributevalues[0];
        }
        // new sublist of areas that match query
        var match_areas = [];

        var fuse = new Fuse(areas, {
            keys: ["properties.country",
                "properties.unavco_name", "properties.region",
                "properties.mission", "properties.reference"
            ]
        });
        var matchingAreas = fuse.search(query);
        if (matchingAreas.length === 0) {
            return;
        }
        // update current map areas
        myMap.areas = matchingAreas;
        var json = {
            "areas": matchingAreas
        };
        myMap.addSwathsFromJSON(json, null, true, false);
    }
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
            var $sfrContainer = $("#search-form-and-results-container");
            if (!$subsetSwathPopup.hasClass("active") && $sfrContainer.hasClass("maximized")) {
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
                attributesController.setArea(subsetFeature);
                var rowClass = subsetFeature.properties.unavco_name + "-search-row";
                var attributes = attributesController.getAllAttributes();
                var html = "<tr class='" + rowClass + "'>";
                html += "<td>" + attributes.first_date + "</td>";
                html += "<td>" + attributes.last_date + "</td>";
                html += "<td>" + attributes.unavco_name; 
                html += "<button>Copy</button></td>";
                html += "</tr>";
                $subsetSwathTableBody.append(html);

                $("." + rowClass).css({ cursor: "pointer" });
                $("." + rowClass).click(function() {
                    if ((!currentArea || (subsetFeature.properties.unavco_name != currentArea.properties.unavco_name))
                        && !$("#dataset-frames-toggle-button").hasClass("toggled")) {
                        SearchFormController.loadedSubsets = false;
                        myMap.loadDatasetFromFeature(subsetFeature);
                    }
                });
                $("." + rowClass + " > td > button").click(function(e) {
                    e.stopPropagation(); // don't trigger parent click event
                    copyTextToClipboard(subsetFeature.properties.unavco_name);
                });
            });

            // gotta target even the thead row for the below to work
            // otherwise, we can get strange edge cases where we get two rows highlighted
            // if i target only #subset-swath-table > tbody tr, then we get two rows highlighted
            // when user hovers over thead and then back to main search-form-results-table
            var $tr = $("#subset-swath-table tr");
            // make search form table highlight on hover
            $tr.hover(function() {
                if (!$(this).parent().is("thead")) {
                    if (!SearchFormController.loadedSubsets) {
                        myMap.addSubsetSwaths(mainFeature, false);
                        SearchFormController.loadedSubsets = true;
                    }

                    searchTableHoverIn(this);
                }
            }, function(e) {
                if (!$(this).parent().is("thead")) {
                    $(this).each(function() {
                        searchTableHoverOut(this);
                    });
                }

                // need a foreach because it just simplifies the logic...
                // not sure why but .parent().parent() doesn't return similar type
                // of things for both search-form-results-table and subset-swath-table tr's...
                $(e.relatedTarget).parents().each(function() {
                    if ($(this).attr("id") === "search-form-results-table") {
                        $("#search-form-results-table tbody > tr").each(function() {
                            searchTableHoverOut(this);
                        });
                    }
                });
            });
        });
    };

    /**
     * Given dictionary of attributes, generate HTML row displaying dataset with those attributes
     * @param {Array} areaAttributes - if user inputs at least one search criteria, null otherwise
     */
    this.generateMatchingAreaHTML = function(area) {

        var attributesController = new AreaAttributesController(myMap, area);
        areaAttributes = attributesController.getAllAttributes();
        var satellite = areaAttributes.mission;
        var relative_orbit = areaAttributes.relative_orbit;
        var first_frame = areaAttributes.first_frame ? areaAttributes.first_frame : areaAttributes.frame;
        first_frame = first_frame.toString() != "0" ? first_frame : "N/A";
        var mode = areaAttributes.beam_mode;
        var flight_direction = areaAttributes.flight_direction;
        var unavco_name = area.properties.unavco_name;
        var rowClass = unavco_name + "-search-row";
        var html = "<tr class='" + rowClass + "'><td class='col-xs-2'>" + satellite + "</td><td class='col-xs-2 col-half-offset'>" + relative_orbit + "</td><td class='col-xs-2 col-half-offset'>" +
            first_frame + "</td><td class='col-xs-2 col-half-offset'>" + mode + "</td><td class='col-xs-2 col-half-offset'>" + flight_direction + "</td></tr>";

        var subsetFeatures = myMap.getSubsetFeatures(area);
        var haveSubsets = subsetFeatures && subsetFeatures.length > 1;
        if (haveSubsets) {
            html = "<tr class='" + rowClass + "' class='have-subsets'><td class='col-xs-2'>" + satellite + "</td><td class='col-xs-2 col-half-offset'>" + relative_orbit + "</td><td class='col-xs-2 col-half-offset'>" +
                first_frame + "</td><td class='col-xs-2 col-half-offset'>" + mode + "</td><td class='col-xs-2 col-half-offset'>" + flight_direction +
                "<div class='show-children-button caret' id='" + unavco_name + "'></div></td></tr>";
        }

        $("#search-form-results-table tbody").append(html);
        $("." + rowClass).css({ cursor: "pointer" });
        $("." + rowClass).click(function() {
            if ((!currentArea || (area.properties.unavco_name != currentArea.properties.unavco_name))
                && !$("#dataset-frames-toggle-button").hasClass("toggled")) {
                myMap.loadDatasetFromFeature(area);
            }
        });

        if (haveSubsets) {
            this.populateSubsetPopup(area, subsetFeatures);
        }
    };

    this.makeTableRowsInteractive = function() {
        $("#search-form-results-table tbody > tr").hover(function(e) {
            var $subsetSwathPopup = $("#subset-swath-popup");
            if ($subsetSwathPopup.hasClass("active")) {
                $subsetSwathPopup.removeClass("active");
            }

            if (SearchFormController.loadedSubsets && !$("#dataset-frames-toggle-button").hasClass("toggled")) {
                myMap.loadSwathsInCurrentViewport(false);
                SearchFormController.loadedSubsets = false;
            }
            searchTableHoverIn(this);
        }, function() {
            $(this).each(function() {
                searchTableHoverOut(this);
            });
        });

        $("#search-form-results-table").trigger("update");
    };

    this.getDatasetsMoreRecentThan = function(datasets, years) {
        var attributesController = new AreaAttributesController(myMap, datasets[0]);
        var areaAttributes = null;
        var filteredDatasets = [];

        for (var i = 0; i < datasets.length; i++) {
            attributesController.setArea(datasets[i]);
            areaAttributes = attributesController.getAllAttributes();
            var areaDate = new Date(areaAttributes.last_date);
            var millisecondsInYear = 1000 * 60 * 60 * 24 * 365;
            var timeDifference = (new Date() - areaDate) / millisecondsInYear;
            // dataset last_date older than a year, don't include it (i.e., don't even search it)
            if (timeDifference <= years) {
                filteredDatasets.push(datasets[i]);
            }
        }

        return filteredDatasets;
    };

    this.search = function() {
        $("#search-form-results-table tbody").empty();
        var matchingAreas = [];

        // special case if user inputs no attributes to search by, we get null instead of a dictionary
        var searchAttributes = this.getSearchAttributes();
        // get array of all areas on map
        var areas = myMap.allAreas;
        var attributesController = new AreaAttributesController(myMap, areas[0]);
        var areaAttributes = null;
        var attributesMatch = true;

        // for each area, get attributes
        areas.forEach(function(area) {
            attributesController.setArea(area);
            areaAttributes = attributesController.getAllAttributes();
            attributesMatch = true;

            // for each attribute inputted by user, compare to attribute of same name in area
            // if attribute values do not match, break
            for (var key in searchAttributes) {
                var attribute = areaAttributes[key];
                if (attribute && attribute.toLowerCase() != searchAttributes[key].toLowerCase()) {
                    attributesMatch = false;
                    break;
                }
            }
            // if all attributes match, add area to array matchingAreas and generate HTML row displaying that area's attributes
            if (attributesMatch || !searchAttributes) {
                matchingAreas.push(area);
            }
        });

        if ($("#recent-datasets-toggle-button").hasClass("toggled")) {
            matchingAreas = this.getDatasetsMoreRecentThan(matchingAreas, 1.0);
        }

        matchingAreas.forEach(function(area) {
            this.generateMatchingAreaHTML(area);
        }.bind(this));

        if (matchingAreas.length > 0) {
            // update current map areas
            myMap.areas = matchingAreas;
            var json = {
                "areas": matchingAreas
            };
            myMap.addSwathsFromJSON(json, null, true, false);

            this.makeTableRowsInteractive();
        }

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
        if (e.keyCode === ENTER_KEY && ($("#search-form input").is(":focus")) && (!$("#search-input").val())) {
            if (myMap.areas) {
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
