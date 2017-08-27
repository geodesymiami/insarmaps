function USGSEventsOptionsController(divID) {
    this.divID = divID;

    // populate view with start and end date
    // end date is today, start date is 2 years from now
    this.populateDateInputs = function() {
    	var now = new Date();
        var startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 2);
        var nowString = $.datepicker.formatDate("yy-M-d", now);
        var startDateString = $.datepicker.formatDate("yy-M-d", startDate);

        $("#" + this.divID + " .start-date").val(startDateString);
        $("#" + this.divID + " .end-date").val(nowString);
    };

    this.populateDateInputs();

    this.getOptions = function() {
        var opts = {};
        var minDate = null;
        var maxDate = null;

        try {
            minDate = $.datepicker.parseDate("yy-M-d",
                        $("#" + this.divID + " .start-date").val());
        } catch (exception) {
            window.alert("Invalid start date.");
        }

        try {
            maxDate =  $.datepicker.parseDate("yy-M-d",
                        $("#" + this.divID + " .end-date").val());
        } catch (exception) {
            window.alert("Invalid end date.");
        }
        opts.minDate = $.datepicker.formatDate("yy-m-d", minDate);
        opts.maxDate = $.datepicker.formatDate("yy-m-d", maxDate);
        opts.minMagnitude = $("#" + this.divID + " .min-magnitude").val();
        opts.maxMagnitude = $("#" + this.divID + " .max-magnitude").val();
        opts.minDepth = $("#" + this.divID + " .min-depth").val();
        opts.maxDepth = $("#" + this.divID + " .max-depth").val();

        // get map bounding box
        var bounds = myMap.map.getBounds();
        var sw = bounds._sw;
        var ne = bounds._ne;
        opts.minLat = sw.lat;
        opts.maxLat = ne.lat;
        opts.minLong = sw.lng;
        opts.maxLong = ne.lng;

        return opts;
    };

    this.getURL = function() {
        var opts = this.getOptions();
        var url = "https://earthquake.usgs.gov/fdsnws/event/1/query?";

        if (opts.minDate) {
            url += "&starttime=" + opts.minDate;
        }
        if (opts.maxDate) {
            url += "&endtime=" + opts.maxDate;
        }
        if (opts.minMagnitude) {
            url += "&minmag=" + opts.minMagnitude;
        }
        if (opts.maxMagnitude) {
            url += "&maxmag=" + opts.maxMagnitude;
        }
        if (opts.minDepth) {
            url += "&mindepth=" + opts.minDepth;
        }
        if (opts.maxDepth) {
            url += "&maxdepth=" + opts.maxDepth;
        }
        if (opts.minLat) {
            url += "&minlat=" + opts.minLat;
        }
        if (opts.maxLat) {
            url += "&maxlat=" + opts.maxLat;
        }
        if (opts.minLong) {
            url += "&minlon=" + opts.minLong;
        }
        if (opts.maxLong) {
            url += "&maxlon=" + opts.maxLong;
        }

        url += "&format=text&nodata=404";

        return url;
    };

    this.onEnterKeyUp = function(callback) {
        $("#" + this.divID + " input").keyup(function(event) {
            const ENTER_KEY = 13;

            if (event.keyCode == ENTER_KEY) {
                callback(this.getURL());
            }
        }.bind(this));
    };
}
