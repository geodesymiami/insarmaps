function populateInputsAutocomplete() {
    $.ajax({
        url: "/areas",
        success: function(response) {
            var features = response.areas;
            populateAutocompleteFromFeatures("input-satellite", features, "mission");
            populateAutocompleteFromFeatures("input-relativeOrbit", features, "relative_orbit");
            populateAutocompleteFromFeatures("input-firstFrame", features, "frame");
            populateAutocompleteFromFeatures("input-mode", features, "beam_mode");
            populateAutocompleteFromFeatures("input-flightDirection", features, "flight_direction");
            $("#input-outputType").autocomplete({
                minLength: 0,
                source: ["dataset", "json", "csv"]
            });
            setupAutocompleteInteractivity();
        }.bind(this),
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("failed " + xhr.responseText);
        }
    });
}

function setupAutocompleteInteractivity() {
    $(".custom-input-dropdown").on("click", function() {
        // clear all show dropdowns to prevent double click bug
        // we could have a variable containing last clicked, maybe even an autocomplete
        // controller class, but not in the mood because alot of bigger fish to fry.
        $(this).each(function() {
            $(this).removeClass("show-dropdown").addClass("hide-dropdown");
        });
        if ($(this).hasClass("hide-dropdown")) {
            $(this).prev("input").autocomplete("search", "");
            $(this).removeClass("hide-dropdown").addClass("show-dropdown");
        } else {
            $(this).prev("input").autocomplete("close");
            $(this).removeClass("show-dropdown").addClass("hide-dropdown");
        }
    });
}

function buildURL() {
    var outputURL = getRootUrl() + "WebServices?";
    // required parameters: longitude, latitude
    var longitude = $("#input-longitude").val();
    var latitude = $("#input-latitude").val();
    var satellite = $("#input-satellite").val();
    var relativeOrbit = $("#input-relativeOrbit").val();
    var firstFrame = $("#input-firstFrame").val();
    var mode = $("#input-mode").val();
    var flightDirection = $("#input-flightDirection").val();
    var startTime = $("#input-startTime").val();
    var endTime = $("#input-endTime").val();
    var outputType = $("#input-outputType").val();
    var WKTBbox = $("#input-WKT-Bbox").val();
    var query = outputURL;

    // check required parameters are not empty - if so construct webservice url
    var isLink = false;
    if (longitude.length > 0 && latitude.length > 0) {
        isLink = true;
        query += "longitude=" + longitude + "&latitude=" + latitude;

        // add optional parameters if they exist
        if (satellite.length > 0) {
            query += "&satellite=" + satellite;
        }

        if (relativeOrbit.length > 0) {
            query += "&relativeOrbit=" + relativeOrbit;
        }

        if (firstFrame.length > 0) {
            query += "&firstFrame=" + firstFrame;
        }

        if (mode.length > 0) {
            query += "&mode=" + mode;
        }

        if (flightDirection.length > 0) {
            query += "&flightDirection=" + flightDirection;
        }

        if (startTime.length > 0) {
            query += "&startTime=" + startTime;
        }

        if (endTime.length > 0) {
            query += "&endTime=" + endTime;
        }

        if (outputType.length > 0) {
            query += "&outputType=" + outputType;
        }

        if (WKTBbox.length > 0) {
            query += "&box=" + WKTBbox;
        }
    } else {
        query = "Error: please input all required parameters";
    }

    var html = null;
    if (isLink) {
        html = "<a target='_blank' href='" + query + "'>" + query + "</a>"
    } else {
        html = query;
    }
    $("#form-webservice-url").html(html);
}

$(window).on("load", function() {
    populateInputsAutocomplete();
    $(".date-input").datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: "yy-m-dd"
    });

    buildURL();

    /**
     * Given user inputted parameters, dispay a url needed for webservice querying of a point from a dataset
     * Example url: http://homestead.app/WebServices?longitude=131.67&latitude=32.53&satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D& endTime=2020-12-20&outputType=json
     */
    $(".form-control").keyup(function(event) {
        const ENTER_KEY = 13;

        if (event.keyCode == ENTER_KEY) {
            buildURL();
        }
    });

});
