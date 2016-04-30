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
            // set title
            geodata.features[i].properties.title = "\"" + i + "\"";

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
        var fileToLoad = file + currentPoint + ".json";

        if (currentPoint <= 23) {
            loadJSONFunc(fileToLoad, that.JSONCallback);
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
            zoom: 1 // starting zoom
        });

        that.map.addControl(new mapboxgl.Navigation());
        // what to do after the map loads
        that.map.once("load", function load() {
            // that.drawer = mapboxgl.Draw();
            // that.map.addControl(that.drawer);
            // drawer to draw a square and select points
            var fileToLoad = file + currentPoint + ".json";
            // load in our sample json
            //that.disableInteractivity();
            loadJSONFunc(fileToLoad, that.JSONCallback);
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
            // the features array seems to have a copy of the actual features, and not the real original
            // features that were added. Thus, I use the title of the feature as a key to lookup the
            // pointer to the actual feature we added, so changes made to it can be seen on the map.
            // that is just a test, so whenever a marker is clicked, the marker symbol is changed to a
            // different one before showing it's information in a popup.
            var actualFeature = that.geoDataMap[title];

            var lineData = {
                labels: ["January", "February", "March", "April", "May", "June", "July"],
                datasets: [{
                    label: "My Second dataset",
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(151,187,205,1)",
                    data: actualFeature.properties.myData
                }, {
                    label: "My third dataset",
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(151,187,205,1)",
                    data: [0, 10, 20, 30, 40, 50]
                }]
            };

            var options = {};

            var ctx = document.getElementById("chart").getContext("2d");
            var lineChart = new Chart(ctx).Line(lineData, options);
            //var myNewChart = new Chart(ctx).Pie(pieData);
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
function loadJSON(fileToLoad, callback) {
    console.log(fileToLoad);
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'geoJSON.php?file=' + fileToLoad, true); // Replace 'my_data' with the path to your file
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
