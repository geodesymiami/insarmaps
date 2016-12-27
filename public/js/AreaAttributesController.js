function AreaAttributesController(map, area) {
    var that = this;

    this.map = map;
    this.attributes = null;
    this.datesArray = JSON.parse(area.properties.decimal_dates);
    this.colorOnPosition = false;

    this.constructAttributes = function() {
        // attributes should be an array, extraAttributes should be an object
        // let's just add all the key values from attributes to extraAttributes
        var attributeKeys = JSON.parse(area.properties.attributekeys);
        var attributeValues = JSON.parse(area.properties.attributevalues);

        var extraAttributes = JSON.parse(area.properties.extra_attributes);

        // use extraAttributes dictionary to save having to copy it's keys
        if (extraAttributes) {
            for (var i = 0; i < attributeKeys.length; i++) {
                var curKey = attributeKeys[i];
                var curValue = attributeValues[i];

                extraAttributes[curKey] = curValue;
            }

            return extraAttributes;
        }

        // no extra attributes, start with fresh dictionary
        var fullAttributes = [];

        for (var i = 0; i < attributeKeys.length; i++) {
            var curKey = attributeKeys[i];
            var curValue = attributeValues[i];

            fullAttributes[curKey] = curValue;
        }

        return fullAttributes;
    };

    this.attributes = this.constructAttributes();

    this.getAllAttributes = function() {
        return that.attributes;
    };

    this.processAttributes = function() {
        if (that.attributes) {
            that.map.colorScale.setScale(that.attributes.plotAttributePreset_colorBar);
            var min = that.attributes.plotAttributePreset_displayMin;
            var max = that.attributes.plotAttributePreset_displayMax;
            that.colorOnPosition = false;
            var yearsElapsed = 0;
            var date1 = null;
            var date2 = null;

            if (that.attributes.plotAttributePreset_endDate) {
                that.colorOnPosition = true;
                date1 = new Date(that.attributes.plotAttributePreset_startDate);
                date2 = new Date(that.attributes.plotAttributePreset_endDate);
                var millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
                var daysPerYear = 365;

                var yearsElapsed = (date2 - date1) / millisecondsPerYear;
            }
            that.map.colorScale.setMinMax(min, max);

            if (that.colorOnPosition) {
                var decimalDate1 = dateToDecimal(date1);
                var decimalDate2 = dateToDecimal(date2);
                var possibleDates = that.map.graphsController.mapDatesToArrayIndeces(decimalDate1, decimalDate2, that.datesArray);
                that.map.selector.minIndex = possibleDates.minIndex;
                that.map.selector.maxIndex = possibleDates.maxIndex;
                that.map.selector.recolorDatasetWithBoundingBoxAndMultiplier(null, yearsElapsed);
            } else {
                that.map.refreshDataset();
            }
        }
    };
}
