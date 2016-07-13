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
            navigatorEvent: null,
            firstToggle
        },
        "chartContainer2": {
            regressionOn: false,
            date_string_array: null,
            date_array: null,
            decimal_dates: null,
            displacement_array: null,
            navigatorEvent: null,
            firstToggle
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
            console.log(maxIndex);
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
            },
            color: "#ffa500"
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

    this.connectDots = function() {
        var chart = $("#chartContainer").highcharts();

        chart.series[0].update({
            type: "line"
        });

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (that.graphSettings["chartContainer"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }

            that.graphSettings["chartContainer"].firstToggle = false;
        }

        // repeat for other chart
        chart = $("#chartContainer2").highcharts();

        if (chart === undefined) {
            return;
        }
        chart.series[0].update({
            type: "line"
        });

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (that.graphSettings["chartContainer2"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }
            that.graphSettings["chartContainer2"].firstToggle = false;
        }
    };

    this.disconnectDots = function() {
        var chart = $("#chartContainer").highcharts();

        chart.series[0].update({
            type: "scatter"
        });

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (that.graphSettings["chartContainer"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }

            that.graphSettings["chartContainer"].firstToggle = false;
        }

        // repeat for other chart
        chart = $("#chartContainer2").highcharts();

        if (chart === undefined) {
            return;
        }
        chart.series[0].update({
            type: "scatter"
        });

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (that.graphSettings["chartContainer2"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }
            that.graphSettings["chartContainer2"].firstToggle = false;
        }
    };

    this.toggleDots = function() {
        var chart = $("#chartContainer").highcharts();

        if (dotToggleButton.toggleState == ToggleStates.ON) {
            that.connectDots();
        } else {
            that.disconnectDots();
        }
    };

    this.addRegressionLines = function() {
        that.addRegressionLine("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {            
            that.addRegressionLine("chartContainer2");
        }
    };

    this.removeRegressionLines = function() {
        that.removeRegressionLine("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            that.removeRegressionLine("chartContainer2");
        }
    };

    this.toggleRegressionLines = function() {
        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            that.addRegressionLines();
        } else {
            that.removeRegressionLines();
        }
    };

    this.prepareForSecondGraph = function() {
        //$("#charts").append('<div id="chartContainer2" class="side-item graph"></div>');
        $("#chartContainer2").css("display", "block");
        $("#chartContainer").height("50%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        $("#chartContainer").height(newHeight);
        $("#chartContainer").highcharts().setSize(newWidth, newHeight, doAnimation = true);
        $("#select-graph-focus-div").css("display", "block");
        that.selectedGraph = $("#select-graph-focus-div").find(":selected").text();
    };

    this.removeSecondGraph = function() {
        var layerID = "touchLocation2";
        if (myMap.map.getLayer(layerID)) {
            myMap.map.removeLayer(layerID);
            myMap.map.removeSource(layerID);
            myMap.touchLocationMarker2 = new mapboxgl.GeoJSONSource();
        }

        //$("#chartContainer2").remove();
        $("#chartContainer2").css("display", "none");
        $("#chartContainer").height("100%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        $("#chartContainer").highcharts().setSize(newWidth, newHeight, doAnimation = true);
        $("#select-graph-focus-div").css("display", "none");
        that.selectedGraph = "Top Graph";
    };

    this.toggleSecondGraph = function() {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            that.prepareForSecondGraph();
        } else {
            that.removeSecondGraph();
        }
    };

    // recreates graphs, preserving the selected ranges on the high charts navigator
    this.recreateGraphs = function() {        
        $("#chartContainer").highcharts(that.highChartsOpts["chartContainer"]);
        var chart = $("#chartContainer").highcharts();
        var graphSettings = that.graphSettings["chartContainer"];

        chart.xAxis[0].setExtremes(graphSettings.navigatorEvent.min, graphSettings.navigatorEvent.max);
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            graphSettings = that.graphSettings["chartContainer2"];
            $("#chartContainer2").highcharts(that.highChartsOpts["chartContainer2"]);
            var chart2 = $("#chartContainer2").highcharts();
            chart2.xAxis[0].setExtremes(graphSettings.navigatorEvent.min, graphSettings.navigatorEvent.max);
        }

        if (dotToggleButton.toggleState == ToggleStates.ON) {
            that.connectDots();
        }

        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            that.addRegressionLines();
        }
        that.setNavigatorHandlers();
    };
}
