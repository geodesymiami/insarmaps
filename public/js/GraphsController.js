function AbstractGraphsController() {
    this.map = null;
    this.highChartsOpts = {};

    // takes any object which can be compared. whether that be js objects
    // or milliseconds
    this.mapDatesToArrayIndeces = function(minDate, maxDate, arrayOfDates) {
        // lower limit index of subarray bounded by slider dates
        // must be >= minDate; upper limit <= maxDate
        var minIndex = 0;
        var maxIndex = 0;

        for (var i = 0; i < arrayOfDates.length; i++) {
            var currentDate = arrayOfDates[i];

            if (currentDate >= minDate) {
                minIndex = i;
                break;
            }
        }
        for (var i = 0; i < arrayOfDates.length; i++) {
            var currentDate = arrayOfDates[i];

            if (currentDate < maxDate) {
                maxIndex = i + 1;
            }
        }

        return {
            minIndex: minIndex,
            maxIndex: maxIndex
        };
    };

    // do as name says, return struct with min and max dates to be optionally used
    this.getValideDatesFromNavigatorExtremes = function(chartContainer) {
        var graphSettings = this.graphSettings[chartContainer];

        var minDate = graphSettings.navigatorEvent.min;
        var maxDate = graphSettings.navigatorEvent.max;
        var minMax = this.mapDatesToArrayIndeces(minDate, maxDate, graphSettings.date_array);

        return minMax;
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

    this.setNavigatorMin = function(chartContainer, min) {
        var chart = $("#" + chartContainer).highcharts();
        var curExtremes = chart.xAxis[0].getExtremes();

        if (!chart) {
            return;
        }
        chart.xAxis[0].setExtremes(min, curExtremes.max);
    };

    this.setNavigatorMax = function(chartContainer, max) {
        var chart = $("#" + chartContainer).highcharts();
        var curExtremes = chart.xAxis[0].getExtremes();

        if (!chart) {
            return;
        }
        chart.xAxis[0].setExtremes(curExtremes.min, max);
    };
}



// for every graph operation, we simply re create the graph.
// set size was playing weird games when the div was resized, and chart.series[0].update
// was playing even weirder games when chart type was being changed. this: http://jsfiddle.net/4r4g327g/4/
// had promise, but it required us using a stockchart, which in turn required us re styling the
// stock chart to look like a regular graph. To save headaches, we simply re create the graph... performance
// penalty is not noticeable.
// TODO: date functions need serious refactoring
function GraphsController() {
    this.graphSettings = {
        "chartContainer": {
            regressionOn: false,
            date_string_array: null,
            date_array: null,
            decimal_dates: null,
            displacement_array: null,
            detrend_displacement_array: null,
            navigatorEvent: null
        },
        "chartContainer2": {
            regressionOn: false,
            date_string_array: null,
            date_array: null,
            decimal_dates: null,
            displacement_array: null,
            detrend_displacement_array: null,
            navigatorEvent: null
        }
    };
}

function setupGraphsController() {
    GraphsController.prototype.selectedGraph = "Top Graph";

    GraphsController.prototype.recreateGraph = function(chartContainer) {
        var graphSettings = this.graphSettings[chartContainer];
        var graphOpts = this.highChartsOpts[chartContainer];
        $("#" + chartContainer).highcharts(graphOpts);
        var chart = $("#" + chartContainer).highcharts();

        if (!chart) {
            return;
        }
        chart.xAxis[0].setExtremes(graphSettings.navigatorEvent.min,
            graphSettings.navigatorEvent.max);
        chart.setTitle(null, {
            text: graphOpts.subtitle.text
        });

        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            this.addRegressionLines();
        }
    };

    GraphsController.prototype.JSONToGraph = function(json, chartContainer, clickEvent) {
        var date_string_array = json.string_dates;
        var date_array = convertStringsToDateArray(date_string_array);
        var decimal_dates = json.decimal_dates;
        var displacement_array = json.displacements;

        // convert from m to cm
        displacement_array.forEach(function(element, index, array) {
            array[index] = 100 * array[index];
        });

        this.graphSettings[chartContainer].date_string_array = date_string_array;
        this.graphSettings[chartContainer].date_array = date_array;
        this.graphSettings[chartContainer].decimal_dates = decimal_dates;
        this.graphSettings[chartContainer].displacement_array = displacement_array;

        // returns array for displacement on chart
        chart_data = getDisplacementChartData(displacement_array, date_string_array);
        this.graphSettings[chartContainer].chart_data = chart_data;

        // calculate and render a linear regression of those dates and displacements
        var result = calcLinearRegression(displacement_array, decimal_dates);
        var slope = result["equation"][0];
        var y = result["equation"][1];

        // testing standard deviation calculation - we are using slope of linear reg line
        // as mean which gives different answer from taking mean of displacements
        var velocity_std = getStandardDeviation(displacement_array, slope);

        // returns array for linear regression on chart
        var regression_data = getRegressionChartData(slope, y, decimal_dates, chart_data);

        // now add the new regression line as a second dataset in the chart
        firstToggle = true;

        // if a time scale previously set manually or via extra attributes of area
        // set these to the default starting range
        var minDate = chart_data[0][0];
        var maxDate = chart_data[chart_data.length - 1][0];
        if (myMap.selector.minIndex != -1 && myMap.selector.maxIndex != -1) {
            minDate = chart_data[myMap.selector.minIndex][0];
            maxDate = chart_data[myMap.selector.maxIndex][0];
        }

        // set a counter for keeping track of number of clicks to graph points
        var pointClickedCounter = 0;

        // edge case: set an index for the last point clicked so user cannot click a single dot twice
        var lastPointClicked = -1;

        var chartOpts = {
            title: {
                text: null
            },
            subtitle: {
                text: "velocity: " + (slope * 10).toFixed(2).toString() + " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() + " mm/yr"
            },
            navigator: {
                enabled: true
            },
            scrollbar: {
                liveRedraw: false
            },
            xAxis: {
                type: 'datetime',
                events: { // get dates for slider bounds
                    afterSetExtremes: function(e) {
                        // we get called when graph is created
                        this.graphSettings[chartContainer].navigatorEvent = e;
                        var dates = this.getValideDatesFromNavigatorExtremes(chartContainer);
                        myMap.selector.lastMinIndex = myMap.selector.minIndex;
                        myMap.selector.lastMaxIndex = myMap.selector.maxIndex;
                        // set selector to work
                        myMap.selector.minIndex = dates.minIndex;
                        myMap.selector.maxIndex = dates.maxIndex;

                        var graphSettings = this.graphSettings[chartContainer];
                        // update velocity, even if we don't have a linear regression line, needed the extra check as this library calls this function when graph is created... sigh
                        var displacements = (detrendToggleButton.toggleState == ToggleStates.ON && graphSettings.detrend_displacement_array) ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
                        var regression_data = this.getLinearRegressionLine(chartContainer, displacements);
                        var sub_slope = regression_data.linearRegressionData["equation"][0];
                        var velocity_std = regression_data.stdDev;
                        var chart = $("#" + chartContainer).highcharts();
                        var velocityText = "velocity: " + (sub_slope * 10).toFixed(2).toString() + " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() + " mm/yr"

                        this.highChartsOpts[chartContainer].subtitle.text = velocityText;

                        chart.setTitle(null, {
                            text: velocityText
                        });

                        if (regressionToggleButton.toggleState == ToggleStates.ON) {
                            var graphSettings = this.graphSettings[chartContainer];
                            var displacements_array = (detrendToggleButton.toggleState == ToggleStates.ON && graphSettings.detrend_displacement_array) ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
                            this.addRegressionLine(chartContainer, displacements_array);
                        }

                        // haven't changed since last recoloring? well dont recolor (only if it's the same area of course)
                        var selector = this.map.selector;
                        // probably first time called which is a red herring
                        if (selector.lastMinIndex == -1 || selector.lastMaxIndex == -1) {
                            return;
                        }
                        if (selector.lastbbox == selector.bbox && selector.lastMinIndex == selector.minIndex && selector.lastMaxIndex == selector.maxIndex) {
                            return;
                        }
                        if (selector.bbox != null && selector.minIndex != -1 && selector.maxIndex != -1) {
                            if (this.map.colorOnDisplacement) {
                                var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.string_dates));
                                var startDate = new Date(dates[this.map.selector.minIndex]);
                                var endDate = new Date(dates[this.map.selector.maxIndex]);
                                this.map.selector.recolorOnDisplacement(startDate, endDate, "Recoloring...", "ESCAPE to interrupt");
                            } else {
                                this.map.selector.recolorDataset();
                            }
                        }
                    }.bind(this)
                },
                dateTimeLabelFormats: {
                    month: '%b %Y',
                    year: '%Y'
                },
                title: {
                    text: 'Date'
                },
                min: minDate,
                max: maxDate
            },
            yAxis: {
                title: {
                    text: 'LOS Displacement (cm)'
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
            },
            tooltip: {
                headerFormat: '',
                pointFormat: '{point.x:%e. %b %Y}: {point.y:.6f} cm'
            },
            series: [{
                type: 'scatter',
                name: 'Displacement',
                data: chart_data,
                marker: {
                    enabled: true
                },
                showInLegend: false,
                events: {
                    // feature: when user clicks point, set point to be min or max index
                    // of graph depending on odd or even number of clicks
                    click: function(e) {
                        pointClickedCounter++;
                        var graphSettings = this.graphSettings[chartContainer];
                        var chartData = graphSettings.chart_data;
                        var chart = $('#' + chartContainer).highcharts();
                        var extremes = chart.xAxis[0].getExtremes();
                        var minMax = this.mapDatesToArrayIndeces(extremes.min, extremes.max, graphSettings.date_array);

                        console.log(minMax.maxIndex - minMax.minIndex);
                        // only two points in view, so return
                        if ((minMax.maxIndex - minMax.minIndex) < 2) {
                            return;
                        }

                        // stop user from clicking same point twice
                        if (e.point.index == lastPointClicked) {
                            console.log("repeat");
                            return;
                        }
                        if (pointClickedCounter % 2 == 1) {
                            myMap.selector.minIndex = e.point.index;
                            var minDate = chartData[e.point.index][0];
                            this.setNavigatorMin(chartContainer, minDate);
                        } else {
                            myMap.selector.maxIndex = e.point.index;
                            var maxDate = chartData[e.point.index - 1][0];
                            this.setNavigatorMax(chartContainer, maxDate);
                        }
                        lastPointClicked = e.point.index;

                    }.bind(this)
                }
            }],
            chart: {
                marginRight: 50
            },
            exporting: {
                enabled: false
            }
        };

        this.graphSettings[chartContainer].navigatorEvent = clickEvent;

        // take out navigator not only if this is the bottom graph, but if the second graph toggle is on, period
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            chartOpts.navigator.enabled = false;
        }

        $('#' + chartContainer).highcharts(chartOpts);
        this.highChartsOpts[chartContainer] = chartOpts;

        this.setNavigatorHandlers();

        // this calls recreate in the background.
        // TODO: make detrend data functions not call recreate
        if (detrendToggleButton.toggleState == ToggleStates.ON) {
            this.detrendDataForGraph(chartContainer);
        }

        if (dotToggleButton.toggleState == ToggleStates.ON) {
            this.toggleDots();
        }

        // this is hackish. due to bug which appears when we resize window before moving graph. jquery resizable
        // size does weird stuff to the graph, so we have to set every new graph to the dimensions of the original graph
        var width = $("#chartContainer").width();
        var height = $("#chartContainer").height();
        $("#" + chartContainer).highcharts().setSize(width, height, doAnimation = true);
    };


    GraphsController.prototype.getLinearRegressionLine = function(chartContainer, displacement_array) {
        var graphSettings = this.graphSettings[chartContainer];
        var validDates = this.getValideDatesFromNavigatorExtremes(
            chartContainer);
        // returns array for displacement on chart
        var chart_data = getDisplacementChartData(displacement_array,
            graphSettings.date_string_array);

        var sub_displacements = displacement_array.slice(validDates.minIndex,
            validDates.maxIndex + 1);
        var sub_decimal_dates = graphSettings.decimal_dates.slice(
            validDates.minIndex, validDates.maxIndex + 1);
        var sub_result = calcLinearRegression(sub_displacements,
            sub_decimal_dates);
        // get linear regression data for sub array
        var sub_chart_data = chart_data.slice(validDates.minIndex,
            validDates.maxIndex + 1);
        var sub_slope = sub_result["equation"][0];
        var sub_y = sub_result["equation"][1];
        var regression_data = getRegressionChartData(sub_slope, sub_y,
            sub_decimal_dates, sub_chart_data);
        var stdDev = getStandardDeviation(sub_displacements, sub_slope);

        var date_range = Highcharts.dateFormat(null, validDates.minDate) +
            " - " + Highcharts.dateFormat(null, validDates.maxDate);

        var lineData = {
            linearRegressionData: sub_result,
            regressionDataForHighcharts: regression_data,
            stdDev: stdDev
        };

        return lineData;
    };

    GraphsController.prototype.addRegressionLine = function(chartContainer, displacement_array) {
        var graphSettings = this.graphSettings[chartContainer];
        var chart = $("#" + chartContainer).highcharts();

        // returns array for displacement on chart
        var chart_data = getDisplacementChartData(displacement_array,
            graphSettings.date_string_array);
        // calculate and render a linear regression of those dates and displacements
        var result = calcLinearRegression(displacement_array, graphSettings
            .decimal_dates);
        var slope = result["equation"][0];
        var y = result["equation"][1];

        // returns array for linear regression on chart
        var regression_data = getRegressionChartData(slope, y,
            graphSettings.decimal_dates, chart_data);
        var regression_data = this.getLinearRegressionLine(chartContainer,
            displacement_array);
        // calculate regression based on current range        
        if (graphSettings.navigatorEvent != null) {
            var sub_slope = regression_data.linearRegressionData["equation"]
                [0];
            var velocity_std = regression_data.stdDev;
            // remove an existing sub array from chart
            this.removeRegressionLine(chartContainer);
            var velocityText = "velocity: " + (sub_slope * 10).toFixed(2).toString() +
                " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() +
                " mm/yr";
            this.highChartsOpts[chartContainer].subtitle.text =
                velocityText;
            chart.setTitle(null, {
                text: velocityText
            });
        }

        var regressionSeries = {
            type: 'line',
            name: 'Linear Regression',
            data: regression_data.regressionDataForHighcharts,
            marker: {
                enabled: false
            },
            color: "#ffa500",
            showInLegend: false
        };

        chart.addSeries(regressionSeries);
    };

    GraphsController.prototype.removeRegressionLine = function(chartContainer) {
        var chart = $('#' + chartContainer).highcharts();
        var seriesLength = chart.series.length;

        for (var i = seriesLength - 1; i > -1; i--) {
            if (chart.series[i].name == "Linear Regression") {
                chart.series[i].remove();
                break;
            }
        }
    };

    GraphsController.prototype.connectDots = function() {
        var graphOpts = this.highChartsOpts["chartContainer"];
        graphOpts.series[0].type = "line";
        this.recreateGraph("chartContainer");
        var chart = $("#chartContainer").highcharts();

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (this.graphSettings["chartContainer"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }

            this.graphSettings["chartContainer"].firstToggle = false;
        }

        // repeat for other chart        
        chart = $("#chartContainer2").highcharts();

        if (chart === undefined) {
            return;
        }

        var graphOpts = this.highChartsOpts["chartContainer2"];
        graphOpts.series[0].type = "line";
        this.recreateGraph("chartContainer2");
        chart = $("#chartContainer2").highcharts();

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (this.graphSettings["chartContainer2"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }
            this.graphSettings["chartContainer2"].firstToggle = false;
        }
    };

    GraphsController.prototype.disconnectDots = function() {
        var graphOpts = this.highChartsOpts["chartContainer"];
        graphOpts.series[0].type = "scatter";
        this.recreateGraph("chartContainer");
        var chart = $("#chartContainer").highcharts(graphOpts);

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (this.graphSettings["chartContainer"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }

            this.graphSettings["chartContainer"].firstToggle = false;
        }
        // no idea why disconnecting dots requires an extra call to setExtremes (without this), the extremes are the max...
        var graphDOM = $("#chartContainer").highcharts();
        var graphSettings = this.graphSettings["chartContainer"];
        graphDOM.xAxis[0].setExtremes(graphSettings.navigatorEvent.min,
            graphSettings.navigatorEvent.max);

        // repeat for other chart        
        chart = $("#chartContainer2").highcharts();

        if (chart === undefined) {
            return;
        }

        var graphOpts = this.highChartsOpts["chartContainer2"];
        graphOpts.series[0].type = "scatter";
        this.recreateGraph("chartContainer2");
        chart = $("#chartContainer2").highcharts();

        // prevents bug resulting from toggling line connecting points on the graph
        // without this, this function gets called the first time, but for some reason,
        // the loop below to delete the linear regression line doesn't get deleted, resulting in two of them
        // i suspect that high charts is doing something with the series array when you use update, resulting in that
        // issue, since the loop works afterwards (when user actually uses the navigator) as normal
        if (this.graphSettings["chartContainer2"].firstToggle) {
            var seriesLength = chart.series.length;

            for (var i = seriesLength - 1; i > -1; i--) {
                if (chart.series[i].name == "Linear Regression") {
                    chart.series[i].remove();
                    break;
                }
            }
            this.graphSettings["chartContainer2"].firstToggle = false;
        }
        graphDOM = $("#chartContainer2").highcharts();
        graphSettings = this.graphSettings["chartContainer2"];
        graphDOM.xAxis[0].setExtremes(graphSettings.navigatorEvent.min,
            graphSettings.navigatorEvent.max);
    };

    GraphsController.prototype.toggleDots = function() {
        var chart = $("#chartContainer").highcharts();

        if (dotToggleButton.toggleState == ToggleStates.ON) {
            this.connectDots();
        } else {
            this.disconnectDots();
        }
    };

    GraphsController.prototype.addRegressionLines = function() {
        var graphSettings = this.graphSettings["chartContainer"];
        var displacements_array = (detrendToggleButton.toggleState ==
            ToggleStates.ON && graphSettings.detrend_displacement_array
        ) ? graphSettings.detrend_displacement_array : graphSettings.displacement_array;
        this.addRegressionLine("chartContainer", displacements_array);
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            graphSettings = this.graphSettings["chartContainer2"];
            displacements_array = (detrendToggleButton.toggleState ==
                    ToggleStates.ON && graphSettings.detrend_displacement_array
                ) ? graphSettings.detrend_displacement_array :
                graphSettings.displacement_array;
            this.addRegressionLine("chartContainer2", displacements_array);
        }
    };

    GraphsController.prototype.removeRegressionLines = function() {
        this.removeRegressionLine("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.removeRegressionLine("chartContainer2");
        }
    };

    GraphsController.prototype.toggleRegressionLines = function() {
        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            this.addRegressionLines();
        } else {
            this.removeRegressionLines();
        }
    };

    GraphsController.prototype.prepareForSecondGraph = function() {
        //$("#charts").append('<div id="chartContainer2" class="side-item graph"></div>');
        $("#chart-containers").width("95%");
        $("#graph-select-div").css("display", "block");
        $("#chartContainer2").css("display", "block");
        $("#chartContainer").height("50%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        $("#chartContainer").height(newHeight);
        var graphOpts = this.highChartsOpts["chartContainer"];
        graphOpts.navigator.enabled = false;

        this.recreateGraph("chartContainer");

        // if chart is already rendered but just hidden, recreate it to resize
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.recreateGraph("chartContainer2");
        }

        $("#select-graph-focus-div").css("display", "block");
        this.selectedGraph = "Bottom Graph";

        topGraphToggleButton.set("off");
        bottomGraphToggleButton.set("on");
    };

    GraphsController.prototype.removeSecondGraph = function() {
        var layerID = "touchLocation2";
        if (myMap.map.getLayer(layerID)) {
            myMap.map.removeLayer(layerID);
            myMap.map.removeSource(layerID);
            myMap.touchLocationMarker2 = new mapboxgl.GeoJSONSource();
        }

        //$("#chartContainer2").remove();
        $("#chart-containers").width("100%");
        $("#graph-select-div").css("display", "none");
        $("#chartContainer2").css("display", "none");
        $("#chartContainer").height("100%");
        var newWidth = $("#chartContainer").width();
        var newHeight = $("#chartContainer").height();
        var graphOpts = this.highChartsOpts["chartContainer"];
        graphOpts.navigator.enabled = true;

        this.recreateGraph("chartContainer");

        this.selectedGraph = "Top Graph";
    };

    GraphsController.prototype.toggleSecondGraph = function() {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            this.prepareForSecondGraph();
        } else {
            this.removeSecondGraph();
        }
    };

    // TODO: make detrend data functions not call recreate
    GraphsController.prototype.detrendDataForGraph = function(chartContainer) {
        var graphSettings = this.graphSettings[chartContainer];
        // returns array for displacement on chart
        var chart_data = getDisplacementChartData(graphSettings.displacement_array,
            graphSettings.date_string_array);

        // calculate and render a linear regression of those dates and displacements
        var result = calcLinearRegression(graphSettings.displacement_array,
            graphSettings.decimal_dates);
        var slope = result["equation"][0];
        var y = result["equation"][1];

        graphSettings.detrend_displacement_array = getlinearDetrend(
                graphSettings.displacement_array, graphSettings.decimal_dates,
                slope)
            // calculate and render a linear regression of those dates and displacements
        result = calcLinearRegression(graphSettings.detrend_displacement_array,
            graphSettings.decimal_dates);
        slope = result["equation"][0];
        y = result["equation"][1];

        chart_data = getDisplacementChartData(graphSettings.detrend_displacement_array,
            graphSettings.date_string_array);
        this.highChartsOpts[chartContainer].series[0].data = chart_data;
        this.highChartsOpts[chartContainer].subtitle.text = "velocity: " +
            (slope * 10).toFixed(2).toString() + " mm/yr" // slope in mm
        this.recreateGraphs();
    };

    GraphsController.prototype.removeDetrendForGraph = function(chartContainer) {
        var graphSettings = this.graphSettings[chartContainer];
        // returns array for displacement on chart
        var chart_data = getDisplacementChartData(graphSettings.displacement_array,
            graphSettings.date_string_array);

        // calculate and render a linear regression of those dates and displacements
        var result = calcLinearRegression(graphSettings.displacement_array,
            graphSettings.decimal_dates);
        var slope = result["equation"][0];
        var y = result["equation"][1];
        chart_data = getDisplacementChartData(graphSettings.displacement_array,
            graphSettings.date_string_array);
        this.highChartsOpts[chartContainer].series[0].data = chart_data;
        this.highChartsOpts[chartContainer].subtitle.text = "velocity: " +
            (slope * 10).toFixed(2).toString() + " mm/yr" // slope in mm
        this.recreateGraphs();
    };

    GraphsController.prototype.detrendData = function() {
        this.detrendDataForGraph("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.detrendDataForGraph("chartContainer2");
        }
    };

    GraphsController.prototype.removeDetrend = function() {
        this.removeDetrendForGraph("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.removeDetrendForGraph("chartContainer2");
        }
    };

    GraphsController.prototype.resizeChartContainers = function() {
        var chartContainersNewHeight = $(".wrap").find(".content").find(
            "#chart-containers").height();
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            chartContainersNewHeight /= 2;
            // resize chart container div's as they don't resize with jquery resizable
            $("#chartContainer2").height(chartContainersNewHeight);
        }

        // resize chart container div's as they don't resize with jquery resizable
        $("#chartContainer").height(chartContainersNewHeight);
    };

    // recreates graphs, preserving the selected ranges on the high charts navigator
    GraphsController.prototype.recreateGraphs = function() {
        this.recreateGraph("chartContainer");
        this.recreateGraph("chartContainer2");

        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            this.addRegressionLines();
        }

        this.setNavigatorHandlers();
    };
}


// we save features in the graphsettings hash map. this is a bit wasteful instead of just saving arrays of x and y values
// of each graph, but it will allow us flexiblity in case sliders for the other graphs are required in the future.
function SeismicityGraphsController() {
    this.graphSettings = {};
    this.features = null;
}

function setupSeismicityGraphsController() {
    SeismicityGraphsController.prototype.setFeatures = function(features) {
        // make sure they are sorted since datetimes have to be sorted for highcharts
        this.features = features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        for (var i = 1; i < this.features.length; i++) {
            if (this.features[i] < this.features[i - 1]) {
                console.log("NOT SORTED");
            }
        }
    };

    SeismicityGraphsController.prototype.getSeriesData = function(xValues, yValues, colorOnInputs, colorStops) {
        var seriesData = [];

        if (xValues.length != yValues.length) {
            throw new Error("Number of values for the x axis (" + xValues.length +
                ") and number of values for the y axis (" + yValues.length + ") differ");
        }

        if (colorOnInputs && colorOnInputs.length != xValues.length) {
            throw new Error("Number of values for the x and y axes (" + xValues.length +
                ") and number of values for the colorOnInputs (" + colorOnInputs.length + ") differ");
        }

        // we do x, y values if no stops provided to avoid highcharts turbothreshold
        if (colorOnInputs) {
            var stopsCalculator = new MapboxStopsCalculator();

            for (var i = 0; i < xValues.length; i++) {
                var index = stopsCalculator.getOutputIndexFromInputStop(colorStops, colorOnInputs[i]);
                var color = colorStops[index][1];
                seriesData.push({
                    x: xValues[i],
                    y: yValues[i],
                    name: "Point2",
                    color: color
                });
            }
        } else {
            for (var i = 0; i < xValues.length; i++) {
                seriesData.push([xValues[i], yValues[i]]);
            }
        }

        return seriesData;
    };

    // TODO: make this a method of AbstractGraphsController and edit GraphsController as appropriate
    SeismicityGraphsController.prototype.getBasicChartJSON = function() {
        var chartOpts = {
            title: {
                text: null
            },
            subtitle: null,
            scrollbar: {
                liveRedraw: false
            },
            xAxis: {
                title: null
            },
            yAxis: {
                title: null,
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
            },
            tooltip: {
                headerFormat: '',
                pointFormat: '{point.y:.6f} Km'
            },
            series: [],
            chart: {
                marginRight: 50
            },
            exporting: {
                enabled: false
            },
            plotOptions: {
                series: {
                    turboThreshold: 0
                }
            }
        };

        return chartOpts;
    };

    SeismicityGraphsController.prototype.createDepthVLongGraph = function(features, chartContainer, selectedColoring) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });
        var longValues = features.map(function(feature) {
            return feature.geometry.coordinates[0];
        });

        var depths = features.map(function(feature) {
            return feature.properties.depth;
        });
        var times = features.map(function(feature) {
            return feature.properties.time;
        });
        var colorOnInputs = depths;
        var colorOnInputs = depthValues;
        var min = this.map.colorScale.min;
        var max = this.map.colorScale.max;
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getDepthStops(min, max, this.map.colorScale.jet_r);

        var depthVLongValues = this.getSeriesData(longValues, depthValues, colorOnInputs, colorStops);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.subtitle = { text: "Longitude vs Depth Cross Section" };
        chartOpts.xAxis.title = { text: "Longitude" };
        chartOpts.yAxis.title = { text: "Depth (Km)" };
        chartOpts.yAxis.reversed = true;

        // save it before we save the data to series
        this.graphSettings[chartContainer] = { opts: chartOpts };
        chartOpts.series.push({
            type: 'scatter',
            name: 'Depth',
            data: depthVLongValues,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        var chart = $("#" + chartContainer).highcharts();
        if (chart) {
            chart.destroy();
        }

        $("#" + chartContainer).highcharts(chartOpts);
    };

    SeismicityGraphsController.prototype.createLatVDepthGraph = function(features, chartContainer, selectedColoring) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });
        var latValues = features.map(function(feature) {
            return feature.geometry.coordinates[1];
        });

        var times = features.map(function(feature) {
            return feature.properties.time;
        });
        var colorOnInputs = depthValues;
        var min = this.map.colorScale.min;
        var max = this.map.colorScale.max;
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getDepthStops(min, max, this.map.colorScale.jet_r);

        var latVdepthValues = this.getSeriesData(depthValues, latValues, colorOnInputs, colorStops);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.subtitle = { text: "Depth vs. Latitude Cross Section" };
        chartOpts.tooltip.pointFormat = "{point.y:.1f} °";
        chartOpts.xAxis.title = { text: "Depth (Km)" };
        chartOpts.yAxis.title = { text: "Latitude" };
        chartOpts.yAxis.labels = { format: "{value:.1f}" };

        // save it before we push the data to series
        this.graphSettings[chartContainer] = { opts: chartOpts };
        chartOpts.series.push({
            type: 'scatter',
            name: 'Depth',
            data: latVdepthValues,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        $("#" + chartContainer).highcharts(chartOpts);
    };

    SeismicityGraphsController.prototype.createCumulativeEventsVDay = function(features, chartContainer, selectedColoring) {
        var millisecondValues = features.map(function(feature) {
            return feature.properties.time;
        });

        var cumulativeValues = features.map(function(feature, index, array) {
            return index + 1;
        });

        var depths = features.map(function(feature) {
            return feature.properties.depth;
        });

        var colorOnInputs = depths;

        var minDate = new Date(millisecondValues[0]);
        var maxDate = new Date(millisecondValues[millisecondValues.length - 1]);
        var minDateString = minDate.toLocaleDateString();
        var maxDateString = maxDate.toLocaleDateString();

        var colorOnInputs = millisecondValues;
        var stopsCalculator = new MapboxStopsCalculator();
        var now = new Date();
        const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
        var min = this.map.colorScale.min;
        var max = this.map.colorScale.max;
        min = (min * millisecondsPerYear) + now.getTime();
        max = (max * millisecondsPerYear) + now.getTime();
        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.colorScale.jet);

        var eventsPerDate = this.getSeriesData(millisecondValues, cumulativeValues, colorOnInputs, colorStops);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.subtitle = { text: "Cumulative Number of Events " + minDateString + " - " + maxDateString };
        chartOpts.tooltip.pointFormat = "{point.y} Events";
        chartOpts.xAxis.type = "datetime";
        chartOpts.xAxis.dateTimeLabelFormats = { month: '%b %Y', year: '%Y' };
        chartOpts.yAxis.title = { text: "Cumulative Number" };
        chartOpts.navigator = { enabled: true };
        chartOpts.xAxis.events = {
            // get dates for slider bounds
            afterSetExtremes: function(e) {
                var minMax = this.mapDatesToArrayIndeces(e.min, e.max, millisecondValues);
                var minMilliseconds = millisecondValues[minMax.minIndex];
                var maxMilliseconds = millisecondValues[minMax.maxIndex];
                var minDateString = new Date(minMilliseconds).toLocaleDateString();
                var maxDateString = new Date(maxMilliseconds).toLocaleDateString();
                var title = "Cumulative Number of Events " + minDateString + " - " + maxDateString;
                $("#" + chartContainer).highcharts().setTitle(null, {
                    text: title
                });

                // they all share the same features
                var features = this.features;
                var featuresInTimeRange = features.filter(function(feature) {
                    return feature.properties.time >= minMilliseconds && feature.properties.time <= maxMilliseconds;
                });

                $("#depth-vs-long-graph").highcharts().destroy();
                $("#lat-vs-depth-graph").highcharts().destroy();
                // only create other two graphs, not recreate this one again
                this.createDepthVLongGraph(featuresInTimeRange, "depth-vs-long-graph", selectedColoring);
                this.createLatVDepthGraph(featuresInTimeRange, "lat-vs-depth-graph", selectedColoring);
                this.map.thirdPartySourcesController.filterSeismicities([{ min: minMilliseconds, max: maxMilliseconds }], "time");
            }.bind(this)
        };
        // save it before we push the data to series
        this.graphSettings[chartContainer] = { opts: chartOpts };

        chartOpts.series.push({
            type: 'scatter',
            name: 'Depth',
            data: eventsPerDate,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        $("#" + chartContainer).highcharts(chartOpts);
    };

    SeismicityGraphsController.prototype.createAllCharts = function(selectedColoring, optionalFeatures) {
        var features = optionalFeatures;

        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }
        this.createChart(selectedColoring, "depth-vs-long-graph", features);
        this.createChart(selectedColoring, "lat-vs-depth-graph", features);
        this.createChart(selectedColoring, "cumulative-events-vs-date-graph", features);
    };

    SeismicityGraphsController.prototype.createChart = function(selectedColoring, chartType, optionalFeatures) {
        // all graphs share same features
        var features = optionalFeatures;

        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }

        if (chartType === "depth-vs-long-graph") {
            this.createDepthVLongGraph(features, "depth-vs-long-graph", selectedColoring);
        } else if (chartType === "lat-vs-depth-graph") {
            this.createLatVDepthGraph(features, "lat-vs-depth-graph", selectedColoring);
        } else if (chartType === "cumulative-events-vs-date-graph") {
            this.createCumulativeEventsVDay(features, "cumulative-events-vs-date-graph", selectedColoring);
        } else {
            throw new Error("Unrecognized chart type " + chartType);
        }
    };

    SeismicityGraphsController.prototype.destroyAllCharts = function() {
        $("#depth-vs-long-graph").highcharts().destroy();
        $("#lat-vs-depth-graph").highcharts().destroy();
        $("#cumulative-events-vs-date-graph").highcharts().destroy();
    };

    SeismicityGraphsController.prototype.recreateAllCharts = function(selectedColoring, optionalFeatures) {
        var features = optionalFeatures;

        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }

        this.destroyAllCharts();
        this.createAllCharts(selectedColoring, features);
    };
}
