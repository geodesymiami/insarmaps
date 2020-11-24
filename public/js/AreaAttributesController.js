// returns json of the property, if string converts to json, otherwise
// returns the property itself
function propertyToJSON(property) {
    if (typeof property == "string") {
        return JSON.parse(property);
    }

    return property;
}

function AreaAttributesController(map, area) {
    var that = this;

    this.map = map;
    this.attributes = null;
    this.datesArray = null;
    this.colorOnDisplacement = false;
    this.area = area;

    this.constructAttributes = function() {
        // attributes should be an array, extraAttributes should be an object
        // let's just add all the key values from attributes to extraAttributes
        this.datesArray = propertyToJSON(this.area.properties.decimal_dates);
        var attributeKeys = propertyToJSON(this.area.properties.attributekeys);
        var attributeValues = propertyToJSON(this.area.properties.attributevalues);

        var extraAttributes = propertyToJSON(this.area.properties.extra_attributes);
        var plotAttributes = propertyToJSON(this.area.properties.plot_attributes);
        var unavco_name = this.area.properties.unavco_name;

        var fullAttributes = [];
        for (var i = 0; i < attributeKeys.length; i++) {
            var curKey = attributeKeys[i];
            var curValue = attributeValues[i];

            fullAttributes[curKey] = curValue;
        }

        // this way, we overwrite any attributes in extra attributes with the ones already
        // there. this is so that extraAttributes has higher priority in deciding attributes
        // while we migrate database to using separate table for attributes.
        if (extraAttributes) {
            for (var curKey in extraAttributes) {
                if (extraAttributes.hasOwnProperty(curKey)) {
                    fullAttributes[curKey] = extraAttributes[curKey];
                }
            }
        }

        if (plotAttributes) {
            fullAttributes["plotAttributes"] = plotAttributes;
        }

        fullAttributes["unavco_name"] = unavco_name;
        fullAttributes["decimal_dates"] = this.datesArray;
        fullAttributes["string_dates"] = propertyToJSON(this.area.properties.string_dates);

        return fullAttributes;
    };

    this.attributes = this.constructAttributes();

    this.getAllAttributes = function() {
        return this.attributes;
    };

    this.getAttribute = function(attributeKey) {
        return this.attributes[attributeKey];
    };

    this.processDatesAndColoring = function(plotAttributes) {
        if (!plotAttributes || plotAttributes.length == 0) {
            return;
        }
        var colorScaleOpts = plotAttributes[0]["plot.colorscale"].split(",");
        var min = colorScaleOpts[0];
        var max = colorScaleOpts[1];
        var units = colorScaleOpts[2]; // we ignore this
        var scaleType = colorScaleOpts[3];

        if (units == "cm") {
            var startDate = new Date(plotAttributes[0]["plot.startDate"]);
            var endDate = new Date(plotAttributes[0]["plot.endDate"]);

            var decimalDate1 = dateToDecimal(startDate);
            var decimalDate2 = dateToDecimal(endDate);

            // this if is taken if plot start date or endate not there
            if (!decimalDate1 || !decimalDate2) {
                var dates = convertStringsToDateArray(propertyToJSON(this.datesArray));
                startDate = dates[0];
                endDate = dates[dates.length - 1];
                this.map.selector.minIndex = 0;
                this.map.selector.maxIndex = dates.length - 1;
            } else {
                var possibleDates = this.map.graphsController.mapExtremesToArrayIndeces(decimalDate1, decimalDate2, this.datesArray);
                this.map.selector.minIndex = possibleDates.minIndex;
                this.map.selector.maxIndex = possibleDates.maxIndex + 1;
            }

            this.map.colorDatasetOnDisplacement(startDate, endDate);
        }
    };

    this.processPresetFigureAttributes = function() {
        var plotAttributes = this.attributes.plotAttributes;
        if (plotAttributes && plotAttributes.length > 0) {
            if (this.areaHasPlotAttribute("plot.colorscale")) {
                var colorScaleOpts = plotAttributes[0]["plot.colorscale"].split(",");
                var min = parseInt(colorScaleOpts[0]);
                var max = parseInt(colorScaleOpts[1]);
                var units = colorScaleOpts[2]; // we ignore this
                var scaleType = colorScaleOpts[3];
                this.map.colorScale.setScale(scaleType);
                this.map.colorScale.setMinMax(min, max);

                if (this.areaHasPlotAttribute("plot.subset.lalo")) {
                    var pysarSubset = this.getPlotAttribute("plot.subset.lalo");
                    var bbox = pysarSubsetToMapboxBounds(pysarSubset);
                    this.map.subsetDataset(bbox, function() {
                        this.processDatesAndColoring(plotAttributes);
                    }.bind(this));
                } else {
                    this.processDatesAndColoring(plotAttributes);
                }
            }
        }
    };

    this.processAttributes = function() {
        var plotAttributes = this.attributes.plotAttributes;
        if (plotAttributes && plotAttributes.length > 0) {
            if (plotAttributes[0]["plot.colorscale"]) {
                var colorScaleOpts = plotAttributes[0]["plot.colorscale"].split(",");
                var min = parseInt(colorScaleOpts[0]);
                var max = parseInt(colorScaleOpts[1]);
                var units = colorScaleOpts[2]; // we ignore this
                var scaleType = colorScaleOpts[3];
                this.map.colorScale.setScale(scaleType);
                if (!(getUrlVar("minScale") && getUrlVar("maxScale"))) {
                    this.map.colorScale.setMinMax(min, max);
                } else console.log("we not gonna do ittttT");
            }

            this.map.refreshDataset();
            this.map.colorScale.setTitle("LOS Velocity<br>[cm/yr]");
        }
    };

    this.setArea = function(area) {
        this.area = area;
        this.attributes = this.constructAttributes();
    };

    this.areaHasAttribute = function(attribute) {
        return this.attributes[attribute] != null;
    };

    this.areaHasPlotAttribute = function(plotAttribute) {
        if (!this.attributes.plotAttributes || this.attributes.plotAttributes.length == 0) {
            return null;
        }

        return this.attributes.plotAttributes[0][plotAttribute] != null;
    };

    this.getPlotAttribute = function(plotAttribute) {
        if (this.areaHasPlotAttribute(plotAttribute)) {
            return this.attributes.plotAttributes[0][plotAttribute];
        }

        return null;
    };
}
