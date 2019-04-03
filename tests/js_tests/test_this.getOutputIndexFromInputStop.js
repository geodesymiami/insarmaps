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

function oldGetOutputIndexFromInputStop(stops, input) {
    var first = 0,
        last = stops.length - 1;
    var middle, cmp = 0;

    while (!(first > last)) {
        // floor due to js's strange integer/float casting
        middle = Math.floor((first + last) / 2);

        cmp = input - stops[middle][0];

        if (cmp == 0) {
            return middle;
        }
        if (cmp < 0) {
            last = middle - 1;
        } else {
            first = middle + 1;
        }
    }

    // if we don't find it, return value of stops just before our input
    cmp = input - stops[middle][0];
    var toReturn = -1;
    if (cmp < 0) {
        toReturn = middle - 1;
    } else {
        toReturn = middle;
    }

    // make sure we are in bounds of array
    if (toReturn < 0) {
        toReturn = 0;
    } else if (toReturn >= stops.length) {
        toReturn = stops.length - 1;
    }

    return toReturn;
};


function newGetOutputIndexFromInputStop(stops, input) {
    var searchResults = binarySearch(stops, input, function(val1, val2) {
        return val2 - val1[0];
    });

    if (searchResults.found) {
        return searchResults.index;
    }

    // if we don't find it, return value of stops just before our input
    cmp = input - stops[searchResults.index][0];
    var toReturn = -1;
    if (cmp < 0) {
        toReturn = searchResults.index - 1;
    } else {
        toReturn = searchResults.index;
    }

    // make sure we are in bounds of array
    if (toReturn < 0) {
        toReturn = 0;
    } else if (toReturn >= stops.length) {
        toReturn = stops.length - 1;
    }

    return toReturn;
};


function test() {
    var multipleStopsArray = [];

    for (var i = 0; i < Math.floor(Math.random() * 10000000) + 1; i++) {
        var curArray = [];
        var beginning = Math.random() * 10;
        var stride = Math.random() * 10;

        for (var j = 0; j < Math.floor(Math.random() * 1000000) + 1; j++) {
            curArray.push([beginning, beginning.toString()]);
            beginning += stride;
        }

        multipleStopsArray.push(curArray);
    }

    console.log(multipleStopsArray);

    for (var i = 0; i < multipleStopsArray.length; i++) {
        var input = Math.random();
        var test1Res = oldGetOutputIndexFromInputStop(multipleStopsArray[i], input);
        var test2Res = newGetOutputIndexFromInputStop(multipleStopsArray[i], input);

        if (test1Res != test2Res) {
            console.log(multipleStopsArray[i]);
            console.log("input: " + input + " test1Res: " + test1Res + " test2Res: " + test2Res);
        }
    }

    // test found
    var i = Math.floor(multipleStopsArray.length / 2);
    var foundValue = multipleStopsArray[i][0];
    var test1Res = oldGetOutputIndexFromInputStop(multipleStopsArray[i], input);
    var test2Res = newGetOutputIndexFromInputStop(multipleStopsArray[i], input);

    if (test1Res != test2Res) {
        console.log(multipleStopsArray[i]);
        console.log("input: " + input + " test1Res: " + test1Res + " test2Res: " + test2Res);
    }
}

test();
