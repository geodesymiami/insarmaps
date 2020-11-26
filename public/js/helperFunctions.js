const MILLISECONDS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
// take an array of displacement values and return velocity standard deviation
var getStandardDeviation = function(displacements, slope, y, decimal_dates) {
    var v_std = 0.0;
    var t_mean = 0;
    decimal_dates.forEach(function(date) {
        t_mean += date;
    });
    t_mean /= decimal_dates.length;

    var sum_range_change = 0.0;
    var sum_times = 0.0;

    for (var i = 0; i < displacements.length; i++) {
        var dis_pred = slope * decimal_dates[i] + y
        sum_range_change += Math.pow(Math.abs(dis_pred - displacements[i]), 2);
        sum_times += Math.pow(Math.abs(decimal_dates[i] - t_mean), 2);
    }

    return Math.sqrt(sum_range_change / (sum_times * (displacements.length - 2)));
}

// falk's date string is in format yyyymmdd - ex: 20090817 
var customDateStringToJSDate = function(dateString) {
    var year = parseInt(dateString.substr(0, 4));
    var month = parseInt(dateString.substr(4, 2));
    var day = parseInt(dateString.substr(6, 2));

    return new Date(year, month - 1, day);
}

// take an array of these string dates and return an array of date objects
var convertStringsToDateArray = function(date_string_array) {
    var date_array = [];
    for (var i = 0; i < date_string_array.length; i++) {
        date_array.push(customDateStringToJSDate(date_string_array[i].toString()));
    }
    return date_array;
}

// find how many days have elapsed in a date object
var getDaysElapsed = function(date) {
    var date2 = new Date(date.getFullYear(), 01, 1);
    var timeDiff = Math.abs(date.getTime() - date2.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

// take displacements, decimal dates, and slope of linear regression line
// returns array of numbers = (displacements - slope * decimal dates)
var getlinearDetrend = function(displacements, decimal_dates, slope) {
    detrend_array = [];
    for (i = 0; i < decimal_dates.length; i++) {
        detrend = displacements[i] - (slope * (decimal_dates[i] - decimal_dates[0]))
        detrend_array.push(detrend);
    }
    return detrend_array;
}

var dateToDecimal = function(date) {
    return date.getFullYear() + getDaysElapsed(date) / 365;
}

// convert date in decimal - for example, 20060131 is Jan 31, 2006
// 31 days have passed so decimal format = [2006 + (31/365)] = 2006.0849
// take an array of date objects and return an array of date decimals
var convertDatesToDecimalArray = function(date_array) {
    var decimals = [];
    for (i = 0; i < date_array.length; i++) {
        decimals.push(dateToDecimal(date_array[i]));
    }
    return decimals;
}

// takes displacements and dates, returns slope and y intercept in array
function calcLinearRegression(displacements, decimal_dates) {
    data = [];
    for (i = 0; i < decimal_dates.length; i++) {
        // data.push([displacements[i], decimal_dates[i]]);
        data.push([decimal_dates[i], displacements[i]]);
    }
    var result = regression('linear', data);
    return result;
}

// takes slope, y-intercept; decimal_dates and chart_data(displacement) must
// this.start and end around bounds of the sliders
function getRegressionChartData(slope, y, decimal_dates, chart_data) {
    var data = [];
    var first_date = chart_data[0][0];
    var first_reg_displacement = slope * decimal_dates[0] + y;
    var last_date = chart_data[chart_data.length - 1][0];
    var last_reg_displacement = slope * decimal_dates[decimal_dates.length - 1] + y;
    data.push([first_date, first_reg_displacement]);
    data.push([last_date, last_reg_displacement]);
    return data;
}

// returns an array of [date, displacement] objects
function getDisplacementChartData(displacements, dates) {
    var data = [];
    for (i = 0; i < dates.length; i++) {
        data.push([customDateStringToJSDate(dates[i]).getTime(), displacements[i]]);
    }

    return data;
}

function getRootUrl() {
    return window.location.origin ? window.location.origin + '/' : window.location.protocol + '/' + window.location.host + '/';
}

function getUrlVar(varName) {
    var url = new URL(window.location.href);

    return url.searchParams.get(varName);
}

function addUrlVarIfNotThere(varName, varToAppend) {
    if (!getUrlVar(varName)) {
        var optionsString = window.location.href.split(window.location.origin)[1];
        optionsString += varToAppend;
        window.history.replaceState({}, "lat_lon", optionsString);
    }
}

function appendUrlVar(varRegex, varToAppend) {
    var optionsString = window.location.href.split(window.location.origin)[1];
    var textRegex = varRegex.test(optionsString)
    if (!textRegex) {
        optionsString += varToAppend;
    } else {
        optionsString = optionsString.replace(varRegex, varToAppend);
    }
    window.history.replaceState({}, "lat_lon", optionsString);
}

function updateUrlState(map) {
    var center = map.map.getCenter();
    var pushStateString = "/start/" + center.lat + "/" + center.lng + "/" + map.map.getZoom();
    if (currentArea) {
        pushStateString += "?flyToDatasetCenter=false" + "&startDataset=" + currentArea.properties.unavco_name;
        var pointID = getUrlVar("pointID");
        if (pointID) {
            pushStateString = pushStateString.replace(/&pointID=\d*/, "");
            pushStateString += "&pointID=" + pointID;
        }
        // TODO: this is hackish. the fact we have to get variables before calling replaceState...
        // a better solution might be to just keep a master url string and manipulate it before calling replaceState
        // the functions will then work on the string as a basis rather than the url... im basically using
        // the browser's url string as a global variable which is the hack of the century...
        var urlMinScale = getUrlVar("minScale");
        var urlMaxScale = getUrlVar("maxScale");
        var urlMinSliderDate = getUrlVar("minDate");
        var urlMaxSliderDate = getUrlVar("maxDate");

        window.history.replaceState({}, "lat_lon", pushStateString);

        if (urlMinScale && urlMaxScale) {
            appendUrlVar(/&minScale=-?\d*\.?\d*/, "&minScale=" + urlMinScale);
            appendUrlVar(/&maxScale=-?\d*\.?\d*/, "&maxScale=" + urlMaxScale);
        } else {
            appendUrlVar(/&minScale=-?\d*\.?\d*/, "&minScale=" + map.colorScale.min);
            appendUrlVar(/&maxScale=-?\d*\.?\d*/, "&maxScale=" + map.colorScale.max);
        }
        var navigatorEvent = map.graphsController.graphSettings["chartContainer"].navigatorEvent;

        if (navigatorEvent) {
            if (urlMinSliderDate && urlMaxSliderDate) {
                appendUrlVar(/&minDate=-?\d*\.?\d*/, "&minDate=" + urlMinSliderDate);
                appendUrlVar(/&maxDate=-?\d*\.?\d*/, "&maxDate=" + urlMaxSliderDate);
            } else {
                appendUrlVar(/&minDate=-?\d*\.?\d*/, "&minDate=" + navigatorEvent.min);
                appendUrlVar(/&maxDate=-?\d*\.?\d*/, "&maxDate=" + navigatorEvent.max);
            }
        }
    } else {
        pushStateString = pushStateString.replace(/&startDataset=.+^/, "");
        if (urlOptions && urlOptions.startingDatasetOptions["pointID"]) {
             delete urlOptions.startingDatasetOptions["pointID"];
        }
        window.history.replaceState({}, "lat_lon", pushStateString);
    }
}

// see: https://stackoverflow.com/questions/1379553/how-might-i-find-the-largest-number-contained-in-a-javascript-array. this is fastest method of finding min and max in array
// is faster than sorting or reduce, etc...
function findMinMaxOfArray(array, sortFunction) {
    var max = array[0];
    var min = array[0];

    // we could check for sortFunction inside loop, but best to have a couple more
    // lines and not have unecessary if else. premature optimization? not sure but i want to do
    // it this way
    if (sortFunction) {
        for (var i = 1; i < array.length; i++) {
            var curValue = array[i];
            if (sortFunction(curValue, max) > 0) {
                max = curValue;
            } else if (sortFunction(curValue, min) < 0) {
                min = curValue;
            }
        }
    } else {
        for (var i = 1; i < array.length; i++) {
            var curValue = array[i];
            if (curValue > max) {
                max = curValue;
            } else if (curValue < min) {
                min = curValue;
            }
        }
    }

    return { max: max, min: min };
}

function pysarSubsetToMapboxBounds(pysarSubset) {
    var latLongLimits = pysarSubset.split(",");
    var latLimits = latLongLimits[0].split(":");
    var longLimits = latLongLimits[1].split(":");
    var bottom = latLimits[0];
    var top = latLimits[1];
    var left = longLimits[0];
    var right = longLimits[1];

    var bounds = [left, bottom, right, top];

    return bounds;
}

function binarySearch(array, toFind, compareFunc) {
    var first = 0, last = array.length - 1;
    var middle = 0;

    while (!(first > last)) {
        var middle = parseInt((first + last) / 2);

        var cmp = compareFunc(array[middle], toFind);

        if (cmp == 0) {
            return { found: true, index: middle };
        }
        if (cmp < 0) {
            last = middle - 1;
        } else {
            first = middle + 1;
        }
    }

    return { found: false, index: middle };
}

// courtesy: https://stackoverflow.com/questions/4156101/javascript-push-array-values-into-another-array
// fastest and most compatible way... could just do it inline I suppose but this uses apply plus adds it
// to array prototype which is nice
Array.prototype.pushArray = function() {
    var toPush = this.concat.apply([], arguments);
    for (var i = 0, len = toPush.length; i < len; i++) {
        this.push(toPush[i]);
    }
};

