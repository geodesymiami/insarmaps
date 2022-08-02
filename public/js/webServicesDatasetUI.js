$(window).on("load", function() {
    var outputURL = getRootUrl() + "WebServicesDataset?";
    var placeholderURL = outputURL + "satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D";

    $("#form-webservice-url").attr("placeholder", placeholderURL);

    /**
    * Given user inputted parameters, dispay a url needed for webservice querying of a dataset
    * Example url: http://homestead.app/WebServices?satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D
    */
    $("#enter-button").click(function() {
        // note: all parameters are optional but if none are inputted then no search
        var satellite = $("#input-satellite").val();
        var relativeOrbit = $("#input-relativeOrbit").val();
        var firstFrame = $("#input-firstFrame").val();
        var mode = $("#input-mode").val();
        var flightDirection = $("#input-flightDirection").val();

        var query = outputURL;
        var emptyQueryLength = query.length;

        if (satellite.length > 0) {
            query += "satellite=" + satellite;
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

        // if end result of query has same length as beginning query, then no parameters were inputted
        if (query.length == emptyQueryLength) {
            query = "Error: please input at least parameter";
        }

        $("#form-webservice-url").val(query);
    });

});
