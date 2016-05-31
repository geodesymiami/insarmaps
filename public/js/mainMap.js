//tippecanoe geo_timeseries_masked_original.json -pf -pk -Bg -d9 -D7 -g4 -rg -o t.mbtiles
// how to do it with leaflet -
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/

var currentPoint = 1;
var currentArea = null;
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
    var that = this;
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.drawer = null;
    this.geoDataMap = {};
    this.layers_ = [];
    this.drawer = null;
    this.loadJSONFunc = loadJSONFunc;
    this.tileURLID = "kjjj11223344.4avm5zmh";
    this.tileJSON = null;
    this.clickLocationMarker = new mapboxgl.GeoJSONSource();

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

    this.initLayer = function(data) {
        var layer;
        var layerList = document.getElementById('layerList');

        data['vector_layers'].forEach(function(el) {
            that.layers_.push({
                id: el['id'] + Math.random(),
                source: 'vector_layer_',
                'source-layer': el['id'],
                interactive: true,
                type: 'circle',
                layout: {
                    'visibility': 'visible'
                },
                paint: {
                    'circle-color': {
                        property: 'm',
                        stops: [
                            [-0.02, '#0000FF'], // blue
                            [-0.01, '#00FFFF'], // cyan
                            [0.0, '#01DF01'], // lime green
                            [0.01, '#FFBF00'], // yellow orange
                            [0.02, '#FF0000']   // red orange
                        ]
                    },
                    'circle-radius': {
                        // for an explanation of this array see here:
                        // https://www.mapbox.com/blog/data-driven-styling/
                        stops: [
                            [5, 2],
                            [8, 2],
                            [13, 8],
                            [21, 16],
                            [34, 32]
                        ]
                    }
                }
            });
        });
        var tileset = 'mapbox.streets';
        that.map.setStyle({
            version: 8,
            sprite: "mapbox://sprites/mapbox/streets-v8",
            glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
            sources: {
                "raster-tiles": {
                    "type": "raster",
                    "url": "mapbox://" + tileset,
                    "tileSize": 256
                },
                'vector_layer_': {
                    type: 'vector',
                    tiles: data['tiles'],
                    minzoom: data['minzoom'],
                    maxzoom: data['maxzoom'],
                    bounds: data['bounds']
                }
            },
            layers: that.layers_
        });

        return layer;
    }

    this.addMapToPage = function(containerID) {
        that.map = new mapboxgl.Map({
            container: containerID, // container id
            center: [130.89, 31.89], // starting position
            zoom: 7 // starting zoom
        });

        var tileset = 'mapbox.streets';
        that.layers_.push({
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        });
        that.map.setStyle({
            version: 8,
            sprite: "mapbox://sprites/mapbox/streets-v8",
            glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
            sources: {
                "raster-tiles": {
                    "type": "raster",
                    "url": "mapbox://" + tileset,
                    "tileSize": 256
                }
            },
            layers: that.layers_
        });

        that.map.addControl(new mapboxgl.Navigation());

        // disable rotation gesture
        that.map.dragRotate.disable();

        that.map.on('click', function(e) {
            var features = that.map.queryRenderedFeatures(e.point, {
                layers: that.layers
            });
            that.map.interactive = false;
            var layerID = "touchLocation";
            //console.log("this is features",features);
            if (!features.length) {
                return;
            }

            var feature = features[0];
            console.log(feature);
            var lat = feature.geometry.coordinates[0];
            var long = feature.geometry.coordinates[1];
            var chunk = feature.properties.c;
            var pointNumber = feature.properties.p;
            var title = chunk.toString() + ":" + pointNumber.toString() + ":" + lat.toString() + ":" + long.toString();

            var query = {
                "area": currentArea,
                "title": title
            }

            if (!that.map.getLayer(layerID)) {
                that.clickLocationMarker.setData({
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lat, long]
                        },
                        "properties": {
                            "marker-symbol": "dog-park"
                        }
                    }]
                });
                that.map.addSource(layerID, that.clickLocationMarker);

                that.map.addLayer({
                    "id": layerID,
                    "type": "symbol",
                    "source": layerID,
                    "layout": {
                        "icon-image": "{marker-symbol}-15",
                    }
                });
            } else {
                that.clickLocationMarker.setData({
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lat, long]
                        },
                        "properties": {
                            "marker-symbol": "dog-park"
                        }
                    }]
                });
            }

            // load displacements from server, and then show on graph
            loadJSONFunc(query, "point", function(response) {
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
                    data.push({x: date_array[i], y: displacement_array[i], label: date_array[i].toLocaleDateString()});
                }

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
                var velocity = "velocity: " + slope;
                // now add the new regression line as a second dataset in the chart
                // fricking apple computers swipe left it goes right - windows does it other way
                var chart = new CanvasJS.Chart("chartContainer", {
                    title: {
                        text: "Timeseries-Displacement Chart", 
                    },
                    axisX: {
                        // instead of leabeling title: "Date", we can display value of slope
                        title: velocity, gridThickness: 2, fontWeight: "bolder"
                    },
                    axisY: {
                        title: "Displacement", fontWeight: "bolder"
                    },
                    data: [{
                        type: "line",
                        markerSize: 7,
                        dataPoints: data
                    }, {
                        type: "line",
                        dataPoints: [{ x: first_date, y: first_regression_displacement, label: first_date.toLocaleDateString() },
                            { x: last_date, y: last_regression_displacement, label: last_date.toLocaleDateString() }
                        ]
                    }]
                });
                chart.render();
                console.log("rendered: " + slope);
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
            var features = that.map.queryRenderedFeatures(that.map.getBounds());
            console.log(that.map.getZoom());
        });
    }
}


// function to use AJAX to load json from that same website - I looked online and AJAX is basically just used
// to asynchronously load data using javascript from a server, in our case, our local website
function loadJSON(arg, param, callback) {
    var fullQuery = param + "/"

    for (var key in arg) {
        fullQuery += arg[key] + "/"
    }

    console.log(fullQuery);
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', fullQuery, true); // Replace 'my_data' with the path to your file
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
