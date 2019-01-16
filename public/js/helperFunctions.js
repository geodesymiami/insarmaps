const MILLISECONDS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
// take an array of displacement values and return velocity standard deviation
var getStandardDeviation = function(displacements, slope, y, decimal_dates) {
    var v_std = 0.0;
    t_mean = 0;
    decimal_dates.forEach(function(date) {
        t_mean += date;
    });
    t_mean /= decimal_dates.length;

    for (i = 0; i < displacements.length; i++) {
        dis_pred = slope * (decimal_dates[i] - decimal_dates[0]) + y
        v_std += Math.pow(Math.abs(dis_pred - displacements[i]), 2) / Math.pow(Math.abs(displacements[i] - t_mean), 2);
    }
    return Math.sqrt(v_std / (displacements.length - 2));
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

// courtesy: https://stackoverflow.com/questions/4156101/javascript-push-array-values-into-another-array
// fastest and most compatible way... could just do it inline I suppose but this uses apply plus adds it
// to array prototype which is nice
Array.prototype.pushArray = function() {
    var toPush = this.concat.apply([], arguments);
    for (var i = 0, len = toPush.length; i < len; i++) {
        this.push(toPush[i]);
    }
};

