// how to do it with leaflet
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/


function Map(loadJSONFunc, clustered) {
    // my mapbox api key
    mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";
    // the map
    this.map = null;
    this.geoJSONSource = null;
    this.geodata = null;
    this.drawer = null;
    this.geoDataMap = {};
    this.clustered = clustered;

    var that = this;

    this.addMapToPage = function(containerID) {
        that.map = new mapboxgl.Map({
            container: containerID, // container id
            style: 'style.json', //stylesheet location
            center: [-74.50, 40], // starting position
            zoom: 1 // starting zoom
        });

        that.map.once("draw.deleted", e => {
                console.log("hi");
        });

        that.map.addControl(new mapboxgl.Navigation());
        // what to do after the map loads
        that.map.once("load", function load() {
            // drawer to draw a square and select points
            that.drawer = mapboxgl.Draw();
            that.map.addControl(that.drawer);
            // load in our sample json
            loadJSONFunc(function(response) {
                // that function is called once the AJAX loads the geojson

                geodata = JSON.parse(response); // put response geojson string into a js object
                //tileIndex = geojsonvt(data);
                //console.log(geodata.features);

                // example loop to show how we can change the geodata JSON object at runtime with code
                for (var i = 0; i < geodata.features.length; i++) {
                    // set title
                    geodata.features[i].properties.title = "\"" + i + "\"";
                    geodata.features[i].properties["marker-color"] = "#09A5FF";
                    geodata.features[i].properties.myData = randomArray();
                    if (i % 3 == 0) {
                        geodata.features[i].properties["marker-symbol"] = "greenMarker";
                    } else if (i % 3 == 1) {
                        geodata.features[i].properties["marker-symbol"] = "redMarker";
                    } else {
                        geodata.features[i].properties["marker-symbol"] = "yellowMarker";
                    }

                    that.geoDataMap[geodata.features[i].properties.title] = geodata.features[i];
                }

                //console.log(geodata.features);

                // a fast webgl (I think) geoJSON layer which will hopefully allow us to add millions of points
                // with little performance hit
                geoJSONSource = new mapboxgl.GeoJSONSource({
                    data: geodata,
                    cluster: that.clustered,
                    clusterMaxZoom: 14, // Max zoom to cluster points on
                    clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
                });

                // IGNORE add in our markers
                /*map.addSource("markers", {
                    "type": "geojson",
                    "data": geodata
                });*/

                that.map.addSource('markers', geoJSONSource);
                that.map.addLayer({
                    "id": "markers",
                    "interactive": true,
                    "type": "symbol",
                    "source": "markers",
                    "layout": {
                        "icon-image": "{marker-symbol}", // stuff in {} gets replaced by the corresponding value
                        "icon-allow-overlap": true,
                        "icon-size": 1 // size of the icon
                    }
                });

                if (clustered) {
                    // Use the earthquakes source to create five layers:
                    // One for non-clustered markers, three for each cluster category,
                    // and one for cluster labels.
                    that.map.addLayer({
                        "id": "non-cluster-markers",
                        "type": "symbol",
                        "source": "markers",
                        "layout": {
                            "icon-image": "marker-15"
                        }
                    });

                    // Display the earthquake data in three layers, each filtered to a range of
                    // count values. Each range gets a different fill color.
                    var layers = [
                        [150, '#f28cb1'],
                        [20, '#f1f075'],
                        [0, '#51bbd6']
                    ];

                    layers.forEach(function(layer, i) {
                        that.map.addLayer({
                            "id": "cluster-" + i,
                            "type": "circle",
                            "source": "markers",
                            "paint": {
                                "circle-color": layer[1],
                                "circle-radius": 18
                            },
                            "filter": i == 0 ? [">=", "point_count", layer[0]] : ["all", [">=", "point_count", layer[0]],
                                ["<", "point_count", layers[i - 1][0]]
                            ]
                        });
                    });

                    // Add a layer for the clusters' count labels
                    that.map.addLayer({
                        "id": "cluster-count",
                        "type": "symbol",
                        "source": "markers",
                        "layout": {
                            "text-field": "{point_count}",
                            "text-font": [
                                "DIN Offc Pro Medium",
                                "Arial Unicode MS Bold"
                            ],
                            "text-size": 12
                        }
                    });
                }
            });
        });



        var popup = new mapboxgl.Popup();

        // When a click event occurs near a marker icon, open a popup at the location of
        // the feature, with description HTML from its properties.
        that.map.on('click', function(e) {
          //console.log("this is e", e);
          //console.log("this is e.point", e.point);
            that.map.featuresAt(e.point, {
                radius: 7.5, // Half the marker size (15px).
                includeGeometry: true,
                layer: 'markers'
            }, function(err, features) {
              //console.log("this is features",features);
                if (err || !features.length) {
                    popup.remove();
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

                //actualFeature.properties["marker-symbol"] = "yellowMarker";
                actualFeature.properties["marker-color"] = "#ff8888";

                geoJSONSource.setData(geodata);

                // Populate the popup and set its coordinates
                // based on the feature found.
                /*  popup.setLngLat(feature.geometry.coordinates)
                      .setHTML("lat " + feature.geometry.coordinates[1] + ", long " + feature.geometry.coordinates[0])
                      .addTo(map);*/
                /*popup.setLngLat(feature.geometry.coordinates)
                    .setHTML("<div id='chartDiv'><canvas id='chart'></canvas></div>")
                    .addTo(map);*/

                /*var pieData = [{
                    value: 20,
                    color: "#878BB6"
                }, {
                    value: 40,
                    color: "#4ACAB4"
                }, {
                    value: 10,
                    color: "#FF8153"
                }, {
                    value: 30,
                    color: "#FFEA88"
                }];*/

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
                        //data: [28, 48, 40, 19, 86, 27, 90]
                        //data: randomArray()
                        data: features[0].properties.myData
                    }]
                };

                var options = {};

                var ctx = document.getElementById("chart").getContext("2d");
                var lineChart = new Chart(ctx).Line(lineData, options);
                //var myNewChart = new Chart(ctx).Pie(pieData);
            });
        });

        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        that.map.on('mousemove', function(e) {
            that.map.featuresAt(e.point, {
                radius: 7.5, // Half the marker size (15px).
                layer: 'markers'
            }, function(err, features) {
                that.map.getCanvas().style.cursor = (!err && features.length) ? 'pointer' : '';
            });
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
            if (that.map.getZoom() < 9) {
                // remove the old layer with large markers and add a new one with small markers
                that.map.removeLayer("markers");
                that.map.addLayer({
                    "id": "markers",
                    "interactive": true,
                    "type": "symbol",
                    "source": "markers",
                    "layout": {
                        "icon-image": "{marker-symbol}",
                        "icon-allow-overlap": true,
                        "icon-size": 0.4 // notice the new, smaller size at higher zoom levels
                    }
                });
            } else {
                // if there is a layer with that name, remove it before adding
                if (that.map.getLayer("markers")) {
                    that.map.removeLayer("markers");
                }

                that.map.addLayer({
                    "id": "markers",
                    "interactive": true,
                    "type": "symbol",
                    "source": "markers",
                    "layout": {
                        "icon-image": "{marker-symbol}",
                        "icon-allow-overlap": true,
                        "icon-size": 0.3 // notice the bigger size at smaller zoom levels.
                    }
                });
            }
        });
        // TODO: the above function can be made much more granular with more else if's
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
function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'http://localhost/insar_map_mvc/storage/json/' + fileName, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}


// TODO: the above function can be made much more granular with more else if's
var myMap = new Map(loadJSON, false);
myMap.addMapToPage("map-container");
