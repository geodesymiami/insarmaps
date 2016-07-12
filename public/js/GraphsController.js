function GraphsController() {
    var that = this;
    this.highChartsOpts = [];
    this.selectedGraph = "Top Graph";
    this.graphSettings = {
        "chartContainer": {
            regressionOn: false,
            date_string_array: null,
            date_array: null,
            decimal_dates: null,
            displacement_array: null,
            mavigatorEvent: null
        },
        "chartContainer2": {
            regressionOn: false,
            date_string_array: null,
            date_array: null,
            decimal_dates: null,
            displacement_array: null,
            navigatorEvent: null
        }
    };

    this.addRegressionLine = function(chartContainer) {
        var graphSettings = that.graphSettings[chartContainer];
        var chart = $("#" + chartContainer).highcharts();

        // returns array for displacement on chart
        var chart_data = getDisplacementChartData(graphSettings.displacement_array, graphSettings.date_string_array);
        // calculate and render a linear regression of those dates and displacements
        var result = calcLinearRegression(graphSettings.displacement_array, graphSettings.decimal_dates);
        var slope = result["equation"][0];
        var y = result["equation"][1];

        // returns array for linear regression on chart
        var regression_data = getRegressionChartData(slope, y, graphSettings.decimal_dates, chart_data);
        // calculate regression based on current range
        if (graphSettings.navigatorEvent != null) {
            // lower limit index of subarray bounded by slider dates
            // must be >= minDate; upper limit <= maxDate                              
            var minIndex = 0;
            var maxIndex = 0;
            var minDate = graphSettings.navigatorEvent.min;
            var maxDate = graphSettings.navigatorEvent.max;
            for (var i = 0; i < graphSettings.date_array.length; i++) {
                var currentDate = graphSettings.date_array[i];
                if (currentDate > minDate) {
                    minIndex = i;
                    break;
                }
            }
            for (var i = 0; i < graphSettings.date_array.length; i++) {
                var currentDate = graphSettings.date_array[i];
                if (currentDate < maxDate) {
                    maxIndex = i + 1;
                }
            }
            var sub_displacements = graphSettings.displacement_array.slice(minIndex, maxIndex + 1);
            var sub_decimal_dates = graphSettings.decimal_dates.slice(minIndex, maxIndex + 1);
            var sub_result = calcLinearRegression(sub_displacements, sub_decimal_dates);
            // get linear regression data for sub array
            var sub_chart_data = chart_data.slice(minIndex, maxIndex + 1);
            var sub_slope = sub_result["equation"][0];
            var sub_y = sub_result["equation"][1];
            regression_data = getRegressionChartData(sub_slope, sub_y, sub_decimal_dates, sub_chart_data);
            // remove an existing sub array from chart
            that.removeRegressionLine(chartContainer);

            var date_range = Highcharts.dateFormat(null, minDate) + " - " + Highcharts.dateFormat(null, maxDate);
            chart.setTitle(null, {
                text: "velocity: " + sub_slope.toString().substr(0, 8) + " m/yr"
            });
        }

        var regressionSeries = {
            type: 'line',
            name: 'Linear Regression',
            data: regression_data,
            marker: {
                enabled: false
            }
        };

        chart.addSeries(regressionSeries);
    };

    this.removeRegressionLine = function(chartContainer) {
        var chart = $('#' + chartContainer).highcharts();
        var seriesLength = chart.series.length;

        for (var i = seriesLength - 1; i > -1; i--) {
            if (chart.series[i].name == "Linear Regression") {
                chart.series[i].remove();
                break;
            }
        }
    };

    this.setNavigatorHandlers = function() {
        $(".highcharts-navigator").mouseenter(function() {
            $(".wrap#charts").draggable("disable");
        }).mouseleave(function() {
            $(".wrap#charts").draggable("enable");
        });;
        $(".highcharts-navigator-handle-left").mouseenter(function() {
            $(".wrap#charts").draggable("disable");
        }).mouseleave(function() {
            $(".wrap#charts").draggable("enable");
        });;
        $(".highcharts-navigator-handle-right").mouseenter(function() {
            $(".wrap#charts").draggable("disable");
        }).mouseleave(function() {
            $(".wrap#charts").draggable("enable");
        });;
    };

    // recreates graphs, preserving the selected ranges on the high charts navigator
    this.recreateGraphs = function() {
        var chart = $("#chartContainer").highcharts(that.highChartsOpts["chartContainer"]);
        
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            var chart2 = $("#chartContainer2").highcharts(that.highChartsOpts["chartContainer2"]);
        }

        that.setNavigatorHandlers();
    };
}
