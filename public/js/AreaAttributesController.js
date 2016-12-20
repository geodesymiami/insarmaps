function AreaAttributesController(map, attributes, datesArray) {
    var that = this;

    this.map = map;
    this.attributes = attributes;
    this.datesArray = datesArray;
    this.colorOnPosition = false;

    this.processAttributes =  function() {
        if (that.attributes != null) {
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
            	var possibleDates = that.map.graphsController.mapDatesToArrayIndeces(decimalDate1, decimalDate2, JSON.parse(that.datesArray));
            	that.map.selector.minIndex = possibleDates.minIndex;
            	that.map.selector.maxIndex = possibleDates.maxIndex;
            	that.map.selector.recolorDatasetWithBoundingBoxAndMultiplier(null, yearsElapsed);
            } else  {
	            that.map.refreshDataset();
	        }
        }
    };
}
