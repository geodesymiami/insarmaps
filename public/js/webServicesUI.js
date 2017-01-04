function getRootUrl() {
    return window.location.origin ? window.location.origin + '/' : window.location.protocol + '/' + window.location.host + '/';
}

$(window).load(function() {
    var outputURL = getRootUrl() + "WebServices?";
    var placeholderURL = outputURL + "longitude=131.67&latitude=32.53&dataset=Alos_SM_72_2970_2980_20070205_20110403&startTime=1990-12-20& endTime=2020-12-20&outputType=plot";

    $("#form-webservice-url").attr("placeholder", placeholderURL);

    /**
    * Given user inputted parameters, dispay a url needed for webservice querying of a point from a dataset
    * Example url: http://homestead.app/WebServices?longitude=131.67&latitude=32.53&dataset=Alos_SM_72_2970_2980_20070205_20110403&startTime=1990-12-20&endTime=2020-12-20&outputType=plot
    */
    $("#enter-button").click(function() {
        // required parameters: longitude, latitude, dataset
        // optional parameters: startTime, endTime, outputType
        var longitude = $("#input-longitude").val();
        var latitude = $("#input-latitude").val();
        var dataset = $("#input-dataset").val();
        var startTime = $("#input-startTime").val();
        var endTime = $("#input-endTime").val();
        var outputType = $("#input-outputType").val();
        var query = outputURL;

        // check required parameters are not empty - if so construct webservice url
        if (longitude.length > 0 && latitude.length > 0 && dataset.length > 0) {
            query += "longitude=" + longitude + "&latitude=" + latitude + "&dataset=" + dataset;

            // add optional parameters if they exist
            if (startTime.length > 0) {
                query += "&startTime=" + startTime;
            }

            if (endTime.length > 0) {
                query += "&endTime=" + endTime;
            }

            if (outputType.length > 0) {
                query += "&outputType=" + outputType;
            }
        } 
        else {
            query = "Error: please input all required parameters";
        }

        $("#form-webservice-url").val(query);
    });

});
