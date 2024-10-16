function USGSEventsOptionsController(divID) {
    this.divID = divID;
    this.UTCTime = "0";

    // populate view with start and end date
    // end date is today, start date is 2 years from now
    this.populateDateInputs = function() {
    	var now = new Date();
        var startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 2);
        this.populateDateInputsFromDates(startDate, now);
    };

    this.populateDateInputsFromDates = function(startDate, endDate) {
        var nowString = $.datepicker.formatDate("yy-M-d", endDate);
        var startDateString = $.datepicker.formatDate("yy-M-d", startDate);

        $("#" + this.divID + " .start-date").val(startDateString);
        $("#" + this.divID + " .end-date").val(nowString);
    };

    this.populateDateInputs();

    this.getOptions = function() {
        var opts = {};
        var minDate = null;
        var maxDate = null;
        var UTCTime = parseFloat(this.UTCTime);

        try {
            minDate = $.datepicker.parseDate("yy-M-d",
                        $("#" + this.divID + " .start-date").val());
            minDate.setUTCHours(0);
            minDate.setUTCMinutes(0);
            minDate.setUTCMilliseconds(0);
            minDate.setUTCSeconds(UTCTime);
        } catch (exception) {
            window.alert("Invalid start date.");
        }

        try {
            maxDate =  $.datepicker.parseDate("yy-M-d",
                        $("#" + this.divID + " .end-date").val());
            maxDate.setUTCHours(0);
            maxDate.setUTCMinutes(0);
            maxDate.setUTCMilliseconds(0);
            maxDate.setUTCSeconds(UTCTime);
        } catch (exception) {
            window.alert("Invalid end date.");
        }
        opts.minDate = minDate.toISOString();
        opts.maxDate = maxDate.toISOString();
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
