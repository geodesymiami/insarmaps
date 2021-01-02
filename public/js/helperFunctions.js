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
var yyyymmddToDate = function(dateString) {
    var year = parseInt(dateString.substr(0, 4));
    var month = parseInt(dateString.substr(4, 2));
    var day = parseInt(dateString.substr(6, 2));

    return new Date(year, month - 1, day);
}

// take an array of these string dates and return an array of date objects
var convertStringsToDateArray = function(date_string_array) {
    var date_array = [];
    for (var i = 0; i < date_string_array.length; i++) {
        date_array.push(yyyymmddToDate(date_string_array[i].toString()));
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
        data.push([yyyymmddToDate(dates[i]).getTime(), displacements[i]]);
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

// TODO: it's much cleaner now. we're really only changing the first part with /start/
// etc. maybe just change the logic to change/deal with this part of the url, and
// forget the rest?
// Basically just deals with lat, long, zoom, and dataset name... everything else is
// updated in the url in the appropriate place (aka when scale changed, dates changed,
// etc we make the appropriate change in those functions). maybe deal with zoom and lat
// long in their appropriate place too. and deal with startDataset and flyToDatasetCenter
// when you click on a dataset and reset the map.
function updateUrlState(map) {
    var center = map.map.getCenter();
    var pushStateString = "/start/" + center.lat.toFixed(4) + "/" + center.lng.toFixed(4) + "/" + map.map.getZoom().toFixed(4);
    if (currentArea) {
        pushStateString += "?flyToDatasetCenter=false" + "&startDataset=" + currentArea.properties.unavco_name;
        var pointLat = getUrlVar("pointLat");
        var pointLon = getUrlVar("pointLon");
        var urlMinScale = getUrlVar("minScale");
        var urlMaxScale = getUrlVar("maxScale");
        var urlMinSliderDate = getUrlVar("startDate");
        var urlMaxSliderDate = getUrlVar("endDate");
        var colorOn = getUrlVar("colorscale");
        if (pointLat) {
            pushStateString += "&pointLat=" + pointLat;
        }
        if (pointLon) {
            pushStateString += "&pointLon=" + pointLon;
        }
        if (urlMinScale) {
            pushStateString += "&minScale=" + urlMinScale;
        }
        if (urlMaxScale) {
            pushStateString += "&maxScale=" + urlMaxScale;
        }
        if (urlMinSliderDate) {
            pushStateString += "&startDate=" + urlMinSliderDate;
        }
        if (urlMaxSliderDate) {
            pushStateString += "&endDate=" + urlMaxSliderDate;
        }
        if (colorOn) {
            pushStateString += "&colorscale=" + colorOn;
        }
    }
    window.history.replaceState({}, "lat_lon", pushStateString);
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

Date.prototype.yyyymmdd = function() {
    var month = this.getMonth() + 1; // getMonth() is zero-based
    var day = this.getDate();
    var customStr = this.getFullYear() + (month > 9 ? "": "0") + month +
                    (day > 9 ? "" : "0") + day;

    return customStr;
};

// easy copy to clipboard. thanks to:
// https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
    } catch (err) {
        window.alert('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
    }, function(err) {
        window.alert('Async: Could not copy text: ', err);
    });
}

// courtesy: http://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device-in-jquery
function browsingThroughMobileDevice() {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
        return true;
    }

    return false;
}

