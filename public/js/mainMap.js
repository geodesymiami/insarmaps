// how to do it with leaflet -
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/

var currentPoint = 1;
var file = "/home/vagrant/code/insar_map_mvc/public/json/geo_timeseries_masked.h5test_chunk_";

// falk's date string is in format yyyymmdd - ex: 20090817 
// take an array of these strings and return an array of date objects
var convertStringsToDateArray = function(date_string_array) {
    var date_array = [];
    for (i = 0; i < date_string_array.length; i++) {
        var year = date_string_array[i].substr(0, 4);
        var month = date_string_array[i].substr(4, 2);
        var day = date_string_array[i].substr(6, 2);
        var date = new Date(year, month, day);
        date_array.push(date);
    }
    return date_array;
}

// find how many days have elapsed in a date object
var getDaysElapsed = function(date) {
    var date2 = new Date(date.getFullYear(), 01, 1);
    var timeDiff = Math.abs(date.getTime() - date2.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

// convert date in decimal - for example, 20060131 is Jan 31, 2006
// 31 days have passed so decimal format = [2006 + (31/365)] = 2006.0849
// take an array of date objects and return an array of date decimals
var convertDatesToDecimalArray = function(date_array) {
    var decimals = [];
    for (i = 0; i < date_array.length; i++) {
        decimals.push(date_array[i].getFullYear() + getDaysElapsed(date_array[i]) / 365);
    }
    return decimals;
}

function Map(loadJSONFunc) {
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.drawer = null;
    this.geoDataMap = {};
    this.layers = [];
    this.drawer = null;
    this.loadJSONFunc = loadJSONFunc;

    this.disableInteractivity = function() {
        that.map.dragPan.disable();
        that.map.scrollZoom.disable();
        that.map.doubleClickZoom.disable();
    };

    this.enableInteractivity = function() {
        that.map.dragPan.enable();
        that.map.scrollZoom.enable();
        that.map.doubleClickZoom.enable();
    };

    this.JSONCallback = function(response) {
        // that function is called once the AJAX loads the geojson

        geodata = JSON.parse(response); // put response geojson string into a js object

        // example loop to show how we can change the geodata JSON object at runtime with code
        for (var i = 0, len = geodata.features.length; i < len; i++) {
            var lat = geodata.features[i].geometry.coordinates[0];
            var long = geodata.features[i].geometry.coordinates[1];;
            // set title
            geodata.features[i].properties.title = currentPoint.toString() + ":" + lat.toString() + ":" + long.toString();

            // add this feature to our map for quick lookup
            that.geoDataMap[geodata.features[i].properties.title] = geodata.features[i];
        }

        // a fast webgl (I think) geoJSON layer which will hopefully allow us to add millions of points
        // with little performance hit
        geoJSONSource = new mapboxgl.GeoJSONSource({
            data: geodata,
            cluster: that.clustered,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
        });

        var id = "markers" + currentPoint;

        that.layers.push(id); // keep track of our layers

        that.map.addSource(id, geoJSONSource);
        that.map.addLayer({
            "id": id,
            "interactive": true,
            "type": "symbol",
            "source": id,
            "layout": {
                "icon-image": "{marker-symbol}", // stuff in {} gets replaced by the corresponding value
                "icon-allow-overlap": true,
                "icon-size": 0.1 // size of the icon
            }
        });
        currentPoint++;
        var fileToLoad = currentPoint.toString();

        if (currentPoint <= 3) {
            loadJSONFunc(fileToLoad, "file", that.JSONCallback);
        } else {
            that.enableInteractivity();
        }
    }

    var that = this;

    this.addMapToPage = function(containerID) {
        that.map = new mapboxgl.Map({
            container: containerID, // container id
            style: 'basicStyle.json', //stylesheet location
            center: [130.89, 31.89], // starting position
            zoom: 7 // starting zoom
        });

        that.map.addControl(new mapboxgl.Navigation());
        // what to do after the map loads
        that.map.once("load", function load() {
            // that.drawer = mapboxgl.Draw();
            // that.map.addControl(that.drawer);
            // drawer to draw a square and select points
            var fileToLoad = currentPoint.toString();
            // load in our sample json
            //that.disableInteractivity();
            loadJSONFunc(fileToLoad, "file", that.JSONCallback);
        });

        // When a click event occurs near a marker icon, open a popup at the location of
        // the feature, with description HTML from its properties.
        that.map.on('click', function(e) {
            var features = that.map.queryRenderedFeatures(e.point, {
                layers: that.layers
            });
            that.map.interactive = false;
            //console.log("this is features",features);
            if (!features.length) {
                return;
            }

            var feature = features[0];
            var title = feature.properties.title;

            // // the features array seems to have a copy of the actual features, and not the real original
            // // features that were added. Thus, I use the title of the feature as a key to lookup the
            // // pointer to the actual feature we added, so changes made to it can be seen on the map.
            // // that is just a test, so whenever a marker is clicked, the marker symbol is changed to a
            // // different one before showing it's information in a popup.
            // var actualFeature = that.geoDataMap[title];

            // load displacements from server, and then show on graph
            loadJSONFunc(title, "point", function(response) {
                var json = JSON.parse(response);

                // put code here, the dates are in dates variable, and points are in
                // falk's dates from json file are in format yyyymmdd - 20090817
                var date_string_array = json.dates;
                var displacement_array = json.displacements;
                var date_array = convertStringsToDateArray(date_string_array);

                // convert dates to decimal format
                var decimal_array = convertDatesToDecimalArray(date_array);

                // format for chart = {x: date, y: displacement}
                data = [];
                for (i = 0; i < date_array.length; i++) {
                    data.push({ x: date_array[i], y: displacement_array[i] });
                }
                console.log(data);

                // calculate and render a linear regression of those dates and displacements
                data_regression = [];
                for (i = 0; i < decimal_array.length; i++) {
                    data_regression.push([decimal_array[i], displacement_array[i]]);
                }
                var result = regression('linear', data_regression);

                // based on result, draw linear regression line by calcuating y = mx+b and plotting 
                // (x,y) as a separate dataset with a single point
                // caculate y = displacement for first and last dates = x in order to plot the line
                var slope = result["equation"][0];
                var y_intercept = result["equation"][1];
                var first_date = date_array[0];
                var first_regression_displacement = slope * decimal_array[0] + y_intercept;
                var last_date = date_array[date_array.length - 1];
                var last_regression_displacement = slope * decimal_array[decimal_array.length - 1] + y_intercept;

                // now add the new regression line as a second dataset in the chart
                // fricking apple computers swipe left it goes right - windows does it other way
                var chart = new CanvasJS.Chart("chartContainer", {
                    title: {
                        text: "Timeseries-Displacement Chart"
                    },
                    axisX: {
                        title: "Date",
                        gridThickness: 2
                    },
                    axisY: {
                        title: "Displacement"
                    },
                    data: [{
                        type: "line",
                        // dataPoints: date_array
                        dataPoints: data
                    }, {
                        type: "line",
                        // dataPoints: date_array
                        dataPoints: [{ x: first_date, y: first_regression_displacement },
                            { x: last_date, y: last_regression_displacement }
                        ]
                    }]
                });
                chart.render();
            });
        });

        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        that.map.on('mousemove', function(e) {
            var features = that.map.queryRenderedFeatures(e.point, { layers: that.layers });
            that.map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
        });

        // handle zoom changed. we want to change the icon-size in the layer for varying zooms.
        // if you notice, in tremaps, all the points are just one size, as if they were real, physical points.
        // so, when you zoom out, the points appear to be smaller than when you are zoomed in. with the markers
        // we are using, though, the marker icons are always the same size, so we can use that function to
        // dynamically change the sizes depending on the current map zoom.
        that.map.on('zoomend', function() {
            // here's where you decided what zoom levels the layer should and should
            // not be available for: use javascript comparisons like < and > if
            // you want something other than just one zoom level, like
            // (map.getZoom > 10)
            console.log(that.map.getZoom());
            if (that.map.getZoom() > 13) {
                // remove the old layer with large markers and add a new one with small markers
                for (var i = 0; i < that.layers.length; i++) {
                    var id = that.layers[i];

                    if (that.map.getLayer(id)) {
                        that.map.removeLayer(id);
                    }

                    that.map.addLayer({
                        "id": id,
                        "interactive": true,
                        "type": "symbol",
                        "source": id,
                        "layout": {
                            "icon-image": "{marker-symbol}",
                            "icon-allow-overlap": true,
                            "icon-size": 0.4 // notice the new, larger size at higher zoom levels
                        }
                    });
                }
            } else if (that.map.getZoom() > 12) {
                // if there is a layer with that name, remove it before adding
                for (var i = 0; i < that.layers.length; i++) {
                    var id = that.layers[i];

                    if (that.map.getLayer(id)) {
                        that.map.removeLayer(id);
                    }

                    that.map.addLayer({
                        "id": id,
                        "interactive": true,
                        "type": "symbol",
                        "source": id,
                        "layout": {
                            "icon-image": "{marker-symbol}",
                            "icon-allow-overlap": true,
                            "icon-size": 0.25 // notice the bigger size at smaller zoom levels.
                        }
                    });
                }
            } else {
                // if there is a layer with that name, remove it before adding
                for (var i = 0; i < that.layers.length; i++) {
                    var id = that.layers[i];

                    if (that.map.getLayer(id)) {
                        that.map.removeLayer(id);
                    }

                    that.map.addLayer({
                        "id": id,
                        "interactive": true,
                        "type": "symbol",
                        "source": id,
                        "layout": {
                            "icon-image": "{marker-symbol}",
                            "icon-allow-overlap": true,
                            "icon-size": 0.1 // notice the bigger size at smaller zoom levels.
                        }
                    });
                }
            }
        });
        // that.map.on("draw.changed", function(e) {
        //     console.log(e)
        // });
    }
}

// Test function that generates an array of random numbers. Simulates each point on map having their own data.
function randomArray() {
    var myArray = [];

    for (var i = 0; i < 7; i++) {
        myArray.push(Math.floor(Math.random() * (50 - 1 + 1)) + 1);
    }

    return myArray;
}


// function to use AJAX to load json from that same website - I looked online and AJAX is basically just used
// to asynchronously load data using javascript from a server, in our case, our local website
function loadJSON(arg, param, callback) {
    console.log(arg);
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'geoJSON.php?' + param + "=" + arg, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

var myMap = new Map(loadJSON);
myMap.addMapToPage("map-container");
