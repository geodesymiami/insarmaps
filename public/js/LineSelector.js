// subclass of square selector
function LineSelector(map) {
    var that = this;

    this.lineJSON = null;
    this.lineWidth = 2;
    this.polygonVertices = null;

    SquareSelector.call(this, map);

    // remove event listener from base constructor calling
    document.removeEventListener("mousedown", that.mouseDown);

    this.setStartPoint = false;
    this.mouseDown = function(e) {
        if (!that.setStartPoint) {
            that.start = that.mousePos(e);
            that.setStartPoint = true;
        } else {
            that.current = that.mousePos(e);
            that.setStartPoint = false;
            var polygonCoordinates = that.getPolygonBbox(that.start, that.current);
            that.finish(polygonCoordinates);
        }
    };

    this.getPolygonBbox = function(start, end) {
        var DISTANCE = that.lineWidth; // to be made dynamic

        var RAD_TO_DEG = 180.0 / Math.PI;
        var startPoint = that.map.map.unproject(start);
        var endPoint = that.map.map.unproject(end);

        var dy = endPoint.lat - startPoint.lat;
        var dx = endPoint.lng - startPoint.lng;

        var angle = Math.atan(dx / dy);

        var otherStart = [start.x + (DISTANCE * Math.cos(angle)), start.y + (DISTANCE * Math.sin(angle))];
        var otherEnd = [end.x + (DISTANCE * Math.cos(angle)), end.y + (DISTANCE * Math.sin(angle))];
        var otherStartUnprojected = that.map.map.unproject(otherStart);
        var otherEndUnprojected = that.map.map.unproject(otherEnd);

        var polygonCoordinates = [
            [
                [startPoint.lng, startPoint.lat],
                [endPoint.lng, endPoint.lat],
                [otherEndUnprojected.lng, otherEndUnprojected.lat],
                [otherStartUnprojected.lng, otherStartUnprojected.lat]
            ]
        ]; // no idea why 3D array, just see their api

        that.polygonVertices = polygonCoordinates;

        return polygonCoordinates;
    };

    // see: http://www.movable-type.co.uk/scripts/latlong.html
    // we get the distance in meters, as we really don't care
    this.getDistanceBetweenPoints = function(fromPoint, toPoint) {
        var DEG_TO_RAD = Math.PI / 180.0;
        var R = 6371e3;
        var phi1 = fromPoint.lat * DEG_TO_RAD;
        var phi2 = toPoint.lat * DEG_TO_RAD;
        var dPhi = (toPoint.lat - fromPoint.lat) * DEG_TO_RAD;
        var dLambda = (toPoint.lng - fromPoint.lng) * DEG_TO_RAD;

        var a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var distance = R * c;

        return distance;
    };

    this.getPointsInPolygon = function(polygonVertices) {
        var features = that.map.map.queryRenderedFeatures();
        var featuresInPolygon = [];
        var featuresMap = [];

        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var featureCoordinates = feature.geometry.coordinates;

            if (that.pointInPolygon(polygonVertices, featureCoordinates)) {
                var curFeatureKey = feature.properties.p.toString();

                // mapbox gives us duplicate tiles (see documentation to see how query rendered features works)
                // yet we only want unique features, not duplicates
                if (featuresMap[curFeatureKey] == null) {
                    featuresInPolygon.push(feature);
                    featuresMap[curFeatureKey] = "1";
                }
            }
        }

        return featuresInPolygon;
    };

    this.finish = function(bbox) {
        if (that.map.map.getSource("topographyLine")) {
            that.map.map.removeLayer("topographyLine");
            that.map.map.removeSource("topographyLine");
        }

        if (that.map.map.getSource("test")) {
            that.map.map.removeLayer("test");
            that.map.map.removeSource("test");
        }

        that.map.map.addSource('topographyLine', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': bbox
                }
            }
        });

        that.map.map.addLayer({
            'id': 'topographyLine',
            'type': 'fill',
            'source': 'topographyLine',
            'layout': {},
            'paint': {
                'fill-color': '#088',
                'fill-opacity': 0.8
            }
        });
        var selectedFeatures = that.getPointsInPolygon(that.polygonVertices[0]);
        //console.log(selectedFeatures);
        var googleFetcher = new GoogleElevationChunkedQuerier({
            onDone: function(results) {
                var query = currentArea.name + "/";
                var set = [];

                for (var i = 0; i < selectedFeatures.length; i++) {
                    query += selectedFeatures[i].properties.p.toString() + "/";
                }

                $.ajax({
                    url: "/points",
                    type: "post",
                    async: true,
                    data: {
                        points: query
                    },
                    success: function(response) {
                        var json = JSON.parse(response);

                        var dataToBeSorted = [];
                        var startPoint = new mapboxgl.LngLat(that.polygonVertices[0][0][0], that.polygonVertices[0][0][1]);
                        // extract elevations into one array for HighCharts
                        for (var i = 0; i < results.length; i++) {
                            for (var j = 0; j < results[i].length; j++) {
                                var result = results[i][j];
                                var curPoint = new mapboxgl.LngLat(result.location.lng(), result.location.lat());
                                var distanceToStart = that.getDistanceBetweenPoints(startPoint, curPoint);

                                var displacement_array = json.displacements[j];
                                var decimal_dates = json.decimal_dates;

                                var linearRegression = calcLinearRegression(displacement_array, decimal_dates);
                                var slope = linearRegression["equation"][0];

                                var data = {
                                    elevation: result.elevation,
                                    distanceToStart: distanceToStart,
                                    velocity: slope
                                };

                                dataToBeSorted.push(data);
                            }
                        }
                        dataToBeSorted.sort(function(a, b) {
                            return a.distanceToStart - b.distanceToStart;
                        });

                        var elevations = [];
                        var distances = [];
                        var velocities = [];

                        for (var i = 0; i < dataToBeSorted.length; i++) {
                            var data = dataToBeSorted[i];
                            elevations.push(data.elevation);
                            distances.push(data.distanceToStart);
                            velocities.push(data.velocity);
                        }

                        that.graphTopography(elevations, velocities, distances);
                    },
                    error: function(xhr, ajaxOptions, thrownError) {
                        console.log("failed " + xhr.responseText);
                    }
                });
            }
        });
        googleFetcher.getTopographyFromGoogle(selectedFeatures);
    };

    this.graphTopography = function(elevations, velocities, distances) {
        if (!$('.wrap#charts').hasClass('active')) {
            $('.wrap#charts').toggleClass('active');
        }
        console.log("hello");
        var elevationChartData = [];
        var velocitiesChartData = [];

        for (var i = 0; i < distances.length; i++) {
            elevationChartData.push(distances[i], elevations[i]);
            velocitiesChartData.push(distances[i], velocities[i]);
        }

        var chartOpts = {
            title: {
                text: null
            },
            subtitle: {
                text: "velocity: "
            },
            navigator: {
                enabled: true
            },
            scrollbar: {
                liveRedraw: false
            },
            xAxis: {
                type: 'linear',
                title: {
                    text: 'Date'
                }
            },
            yAxis: [{
                title: {
                    text: 'Elevations (m)'
                },
                legend: {
                    layout: 'vertical',
                    align: 'left',
                    verticalAlign: 'top',
                    x: 100,
                    y: 70,
                    floating: true,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            }, {
                title: {
                    text: 'Velocities (mm / year)'
                },
                legend: {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: 100,
                    y: 70,
                    floating: true,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            }],
            tooltip: {
                headerFormat: '',
                pointFormat: '{point.x:%e. %b %Y}: {point.y:.6f} m'
            },
            series: [{
                type: 'scatter',
                name: 'Elevations',
                yAxis: 0,
                data: elevationChartData,
                marker: {
                    enabled: true
                },
                showInLegend: false
            }, {
                type: 'scatter',
                name: 'Velocities',
                yAxis: 1,
                data: velocitiesChartData,
                marker: {
                    enabled: true
                },
                showInLegend: false
            }],
            chart: {
                marginRight: 50
            }
        };
        console.log("gonna do it");
        $("#chartContainer").highcharts(chartOpts);
        console.log("did it");
    };

    document.addEventListener("mousedown", that.mouseDown);
}

LineSelector.prototype = new SquareSelector(myMap);
