function GoogleElevationChunkedQuerier(options) {
	var that = this;

    this.sleepTime = 1000;

    // naive approach, but don't feel like hash map since arrays will be small
    this.allChunksFetched = function(allChunksArray) {
        for (var i = 0; i < allChunksArray.length; i++) {
            if (allChunksArray[i] == null) {
                return false;
            }
        }

        return true;
    };

    var ERROR_GETTING_CHUNK = { error: "There was an error getting this chunk" }; // generic pointer

    this.noErrorsFetchingChunks = function(allChunksArray) {
        for (var i = 0; i < allChunksArray.length; i++) {
            if (allChunksArray[i] == ERROR_GETTING_CHUNK) {
                return false;
            }
        }

        return true;
    };

    this.timeouts = [];
    this.allResults = [];

    this.clearTimeouts = function() {
        for (var i = 0; i < that.timeouts.length; i++) {
            clearTimeout(that.timeouts[i]);
        }
    };

    this.getPoints = function(data, allResults) {
    	// if it is the first time this function is called, allocate an array of nulls as this will be a sentinel
    	// telling us when we are done with getting all chunks
        if (data[0].i == 0 && allResults.length == 0) {
            for (var i = 0; i < data.length; i++) {
                allResults.push(null);
            }
        }

        var elevationGetter = new google.maps.ElevationService;
        elevationGetter.getElevationForLocations({
            "locations": data[0].d
        }, function(results, status) {
            if (status === google.maps.ElevationStatus.OK) {
                // allResults[data[0].i] = data[0].i; // for testing receiving data in correct order
                allResults[data[0].i] = results;

                // we check whether all chunks have been fetched, and only then call the done callback
                // the way we've throttled this, I don't think it's possible for chunks to complete out of order
                // but I do this just to be extra sure that all the chunks are being received in order
                if (that.allChunksFetched(allResults)) {
                    if (that.noErrorsFetchingChunks(allResults)) {
                        var allResultsCopy = allResults.slice(0);
                        that.allResults = [];
                        that.timeouts = [];
                        
                        options.onDone(allResultsCopy);                        
                    } else {
                        console.log("There was an error getting one or more chunks");
                    }
                }

                if (data[0].i < (allResults.length - 1)) {
                    var subArray = data.slice(1, data.length);
                    var timeout = setTimeout(function() {
                        that.getPoints(subArray, allResults);
                    }, that.sleepTime);
                    that.timeouts.push(timeout);
                }
            } else if (status === google.maps.ElevationStatus.OVER_QUERY_LIMIT) {
                console.log(status);
               
                that.sleepTime += 1000;

                var timeout = setTimeout(function() {
                    that.getPoints(data, allResults);
                }, that.sleepTime);
                that.timeouts.push(timeout);               
            } else {
                allResults[data[0].i] = ERROR_GETTING_CHUNK;
                console.log("unknown error has occurred with this chunk");
            }
        });
    };

    this.topographyElevations = [];

    this.getTopographyFromGoogle = function(points) {
        var MAX_API_REQUESTS = 512;
        var selectedPoints = [];
        var selectedPointsChunks = [];
        var elevations = [];
        var curChunk = 0;

        // let's split the points into chunks of 512
        for (var i = 0; i < points.length; i++) {
            var long = points[i].geometry.coordinates[0];
            var lat = points[i].geometry.coordinates[1];

            selectedPoints.push({
                lat: lat,
                lng: long
            });

            // 512 points added? append these points as a new chunk
            if (((i + 1) % MAX_API_REQUESTS) == 0 && i != 0) {
                selectedPointsChunks.push({ i: curChunk, d: selectedPoints });
                selectedPoints = [];
                curChunk++;
            }
        }
        // not even multiple? add last chunk
        if (points.length % MAX_API_REQUESTS != 0) {
            selectedPointsChunks.push({ i: curChunk, d: selectedPoints });
        }

        that.getPoints(selectedPointsChunks, that.topographyElevations);

        return elevations;
    };
}
