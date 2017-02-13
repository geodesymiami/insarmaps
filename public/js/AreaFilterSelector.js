// subclass of SquareSelector
function AreaFilterSelector() {}

// needed because need to setup these methods after the map and its canvas load
// and don't want to include these methods in the main page load callback in
// mainPage.js... this wouldn't be necessary if we loaded the map in the global scope
// rather than on full load of the page...
function setUpAreaFilterSelector() {
    AreaFilterSelector.prototype.finish = function(bbox) {
        this.removeInternalEventListeners();
        if (this.box) {
            this.box.parentNode.removeChild(this.box);
            this.box = null;
        }

        var polygonVertices = this.getVerticesOfSquareBbox(bbox);
        var serverBboxCoords = ""
        var bboxString = "LINESTRING()";
        var buffer = 0; // REMOVE POTENTIALLY
        for (var i = 0; i < polygonVertices.length; i++) {
            switch (i) {
                case 0: // nw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 1: // ne
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat += buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 2: // se
                    polygonVertices[i].lng += buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                case 3: // sw
                    polygonVertices[i].lng -= buffer;
                    polygonVertices[i].lat -= buffer;
                    serverBboxCoords += polygonVertices[i].lng + " " + polygonVertices[i].lat + ",";
                    break;
                default:
                    throw "invalid counter";
                    break;
            }
        }
        // add initial vertext again to close linestring
        serverBboxCoords += polygonVertices[0].lng + " " + polygonVertices[0].lat;
        console.log(serverBboxCoords);

        // TODO: refactor success function and loadareamarkers handler
        // to not repeat code
        $.ajax({
            url: "/WebServices?box=LINESTRING(" + serverBboxCoords + ")",
            success: function(response) {
                var json = JSON.parse(response);
                console.log(json);
                var areaMarker = {
                    type: "geojson",
                    cluster: false,
                    clusterRadius: 10,
                    data: {}
                };
                var features = [];

                var attributesController = new AreaAttributesController(myMap, myMap.areaFeatures[0]);
                var searchFormController = new SearchFile();
                var areas = [];

                for (var i = 0; i < json.length; i++) {
                    var curAreaName = json[i];
                    for (var i = 0; i < myMap.areaFeatures.length; i++) {
                        if (myMap.areaFeatures[i].properties.unavco_name === curAreaName) {
                            area.push(myMap.areaFeatures[i]);
                        }
                    }
                }

                $("#search-form-results-table tbody").empty();
                for (var i = 0; i < myMap.areaFeatures.length; i++) {
                    var area = areas[i];
                    var lat = area.coords.latitude;
                    var long = area.coords.longitude;

                    attributesController.setArea(area);
                    var attributes = attributesController.getAllAttributes();

                    var scene_footprint = attributes.scene_footprint;
                    var polygonGeoJSON = Terraformer.WKT.parse(scene_footprint);
                    var lineStringGeoJSON = this.polygonToLineString(polygonGeoJSON);

                    var id = "areas" + i;
                    var polygonID = "areas" + i + "fill"

                    this.areaMarkerLayer.addLayer(id);

                    var properties = area.properties;

                    var feature = {
                        "type": "Feature",
                        "geometry": polygonGeoJSON,
                        "properties": {
                            "marker-symbol": "marker",
                            "layerID": id,
                            "centerOfDataset": area.coords,
                            "unavco_name": properties.unavco_name,
                            "region": properties.region,
                            "project_name": properties.project_name,
                            "num_chunks": properties.num_chunks,
                            "country": properties.country,
                            "decimal_dates": properties.decimal_dates,
                            "attributekeys": properties.attributekeys,
                            "attributevalues": properties.attributevalues,
                            "extra_attributes": properties.extra_attributes
                        }
                    };

                    // use same properties as the main feature which will be used
                    // for the fill layer. We use the id of the corresponding fill layer...
                    // allows for only highlighting on frame hover
                    var polygonFeature = {
                        "type": "Feature",
                        "geometry": polygonGeoJSON,
                        "properties": feature.properties
                    };

                    features.push(feature);

                    // add the markers representing the available areas
                    areaMarker.data = {
                        "type": "FeatureCollection",
                        "features": [feature]
                    };

                    if (this.map.getSource(id)) {
                        this.map.removeSource(id);
                        this.map.removeSource(polygonID)
                    }

                    if (this.map.getLayer(id)) {
                        this.map.removeLayer(id);
                        this.map.removeLayer(polygonID);
                    }

                    this.map.addSource(id, areaMarker);
                    polygonFeature.properties["marker-symbol"] = "fillPolygon";
                    areaMarker.data = {
                        "type": "FeatureCollection",
                        "features": [polygonFeature]
                    };
                    this.map.addSource(polygonID, areaMarker);

                    // if dataset loaded, insert areas before dataset layer
                    if (this.map.getLayer("chunk_1")) {
                        this.map.addLayer({
                            "id": id,
                            "type": "fill",
                            "source": id,
                            "paint": {
                                "fill-color": "rgba(0, 0, 255, 0.0)",
                                "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                            }
                        }, "chunk_1");
                        this.map.addLayer({
                            "id": polygonID,
                            "type": "line",
                            "source": polygonID,
                            "layout": {
                                "line-join": "round",
                                "line-cap": "round"
                            },
                            "paint": {
                                "line-color": "rgba(0, 0, 255, 1.0)",
                                "line-width": 5
                            }
                        }, "chunk_1");
                    } else {
                        this.map.addLayer({
                            "id": id,
                            "type": "fill",
                            "source": id,
                            "paint": {
                                "fill-color": "rgba(0, 0, 255, 0.0)",
                                "fill-outline-color": "rgba(0, 0, 255, 1.0)"
                            }
                        });
                        this.map.addLayer({
                            "id": polygonID,
                            "type": "line",
                            "source": polygonID,
                            "paint": {
                                "line-color": "rgba(0, 0, 255, 1.0)",
                                "line-width": 5
                            }
                        });
                    }

                    searchFormController.generateMatchingAreaHTML(attributes, feature);
                };

                // make search form table highlight on hover
                $("#search-form-results-table tr").hover(function() {
                    $(this).css({ "background-color": "rgba(0, 86, 173, 0.5)" });
                }, function() {
                    $(this).css({ "background-color": "white" });
                });

                $("#search-form-results-table").trigger("update");
                this.areaFeatures = features;

                // add the markers representing the available areas
                areaMarker.data = {
                    "type": "FeatureCollection",
                    "features": features
                };

                if (after) {
                    after(features);
                }
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("failed " + xhr.responseText);
            }
        })
    }
}
