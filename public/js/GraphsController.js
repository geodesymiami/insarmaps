// for every graph operation, we simply re create the graph.
// set size was playing weird games when the div was resized, and chart.series[0].update
// was playing even weirder games when chart type was being changed. this: http://jsfiddle.net/4r4g327g/4/
// had promise, but it required us using a stockchart, which in turn required us re styling the
// stock chart to look like a regular graph. To save headaches, we simply re create the graph... performance
// penalty is not noticeable.
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

    this.JSONToGraph = function(json, chartContainer, clickEvent) {
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
                        var selector = myMap.selector;
                        // probably first time called which is a red herring
                        if (selector.lastMinIndex == -1 || selector.lastMaxIndex == -1) {
                            return;
                        }
                        if (selector.lastbbox == selector.bbox && selector.lastMinIndex == selector.minIndex && selector.lastMaxIndex == selector.maxIndex) {
                            return;
                        }
                        if (myMap.selector.bbox != null && myMap.selector.minIndex != -1 && myMap.selector.maxIndex != -1) {
                            myMap.selector.recolorDataset();
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
                    text: 'Ground Displacement (cm)'
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
                    click: function(e) {
                        console.log(e);
                    }
                }
            }],
            chart: {
                marginRight: 50
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

    this.getLinearRegressionLine = function(chartContainer, displacement_array) {
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

    this.addRegressionLine = function(chartContainer, displacement_array) {
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

    this.disconnectDots = function() {
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

    this.toggleDots = function() {
        var chart = $("#chartContainer").highcharts();

        if (dotToggleButton.toggleState == ToggleStates.ON) {
            this.connectDots();
        } else {
            this.disconnectDots();
        }
    };

    this.addRegressionLines = function() {
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

    this.removeRegressionLines = function() {
        this.removeRegressionLine("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.removeRegressionLine("chartContainer2");
        }
    };

    this.toggleRegressionLines = function() {
        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            this.addRegressionLines();
        } else {
            this.removeRegressionLines();
        }
    };

    this.prepareForSecondGraph = function() {
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

    this.removeSecondGraph = function() {
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

    this.toggleSecondGraph = function() {
        if (secondGraphToggleButton.toggleState == ToggleStates.ON) {
            this.prepareForSecondGraph();
        } else {
            this.removeSecondGraph();
        }
    };

    // TODO: make detrend data functions not call recreate
    this.detrendDataForGraph = function(chartContainer) {
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

    this.removeDetrendForGraph = function(chartContainer) {
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

    this.detrendData = function() {
        this.detrendDataForGraph("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.detrendDataForGraph("chartContainer2");
        }
    };

    this.removeDetrend = function() {
        this.removeDetrendForGraph("chartContainer");
        var chart2 = $("#chartContainer2").highcharts();
        if (chart2 !== undefined) {
            this.removeDetrendForGraph("chartContainer2");
        }
    };

    this.resizeChartContainers = function() {
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

    this.recreateGraph = function(chartContainer) {
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

    // recreates graphs, preserving the selected ranges on the high charts navigator
    this.recreateGraphs = function() {
        this.recreateGraph("chartContainer");
        this.recreateGraph("chartContainer2");

        if (regressionToggleButton.toggleState == ToggleStates.ON) {
            this.addRegressionLines();
        }

        this.setNavigatorHandlers();
    };
}
