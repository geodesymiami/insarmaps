function AbstractGraphsController() {
    this.map = null;
    this.highChartsOpts = {};

    // takes any object which can be compared. whether that be js objects
    // or milliseconds
    this.mapExtremesToArrayIndeces = function(minValue, maxDate, values) {
        // lower limit index of subarray bounded by slider dates
        // must be >= minValue; upper limit <= maxDate
        var minIndex = 0;
        var maxIndex = 0;

        for (var i = 0; i < values.length; i++) {
            var currentDate = values[i];

            if (currentDate >= minValue) {
                minIndex = i;
                break;
            }
        }

        if (minIndex < 0) {
            minIndex = 0;
        }

        for (var i = 0; i < values.length; i++) {
            var currentDate = values[i];

            if (currentDate < maxDate) {
                maxIndex = i + 1;
            }
        }

        if (maxIndex > (values.length - 1)) {
            maxIndex = (values.length - 1);
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
        var minMax = this.mapExtremesToArrayIndeces(minDate, maxDate, graphSettings.date_array);

        return minMax;
    };

    this.setNavigatorHandlers = function(chartID, divIDDisableDraggable) {
        $("#" + chartID + " .highcharts-navigator").mouseenter(function() {
            $("#" + divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $("#" + divIDDisableDraggable).draggable("enable");
        });;
        $("#" + chartID + ".highcharts-navigator-handle-left").mouseenter(function() {
            $("#" + divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $(".wrap#charts").draggable("enable");
        });;
        $("#" + chartID + ".highcharts-navigator-handle-right").mouseenter(function() {
            $("#" + divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $("#" + divIDDisableDraggable).draggable("enable");
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

    this.getBasicChartJSON = function() {
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

    this.createChartDestroyingOld = function(chartContainer, chartOpts) {
        var chart = $("#" + chartContainer).highcharts();
        if (chart) {
            chart.destroy();
        }

        $("#" + chartContainer).highcharts(chartOpts);
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

// for the below two classes, we always destroy and recreate the chart.
// highcharts used to have a bug when updating series: (see: https://forum.highcharts.com/post126503.html#p126503),
// so we took this approach. However, this bug seems to have been fixed (see jsfiddle on this site which now works),
// TODO: so, in the future, consider updating charts instead of destroying and recreating. not doing now as it seems
// like waste of time when there are more bigger fish to fry
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

        // TODO: use getBasicChartJSON function instead of hard coding
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
                        var minMax = this.mapExtremesToArrayIndeces(extremes.min, extremes.max, graphSettings.date_array);

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

        this.setNavigatorHandlers(chartContainer, "charts");

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
            mythis.map.removeLayer(layerID);
            mythis.map.removeSource(layerID);
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

        this.setNavigatorHandlers("chartContainer", "charts");
        this.setNavigatorHandlers("chartContainer2", "charts");

    };
}


// we save features in the graphsettings hash map. this is a bit wasteful instead of just saving arrays of x and y values
// of each graph, but it will allow us flexiblity in case sliders for the other graphs are required in the future.
function SeismicityGraphsController() {
    this.features = null;
    this.mapForPlot = null;
    this.bbox = null;
    this.miniMapColoring = "depth";
    this.depthColorScale = new ColorScale(0, 50, "lat-vs-long-depth-color-scale");
    this.depthColorScale.setTopAsMax(false);
    // can't just call this due to js'ism due to how we do inheritance...
    // TODO: figure out why (not really worth it as it's probably alot of work
    // just to be able to do this.createChart...)
    this.depthColorScale.onScaleChange(function(newMin, newMax) {
        var graphsController = this.map.seismicityGraphsController;
        if (graphsController.miniMapColoring === "depth") {
            var values = graphsController.features.map(function(feature) {
                return feature.properties.depth;
            });
            var chartContainer = "depth-slider";

            var minMax = this.mapExtremesToArrayIndeces(newMin, newMax, values);
            graphsController.timeSlider.setNavigatorMin(chartContainer, values[minMax.minIndex]);
            graphsController.timeSlider.setNavigatorMax(chartContainer, values[minMax.maxIndex]);
        }
    }.bind(this));
    this.timeColorScale = new ColorScale(new Date(0).getTime(), new Date(50).getTime(), "lat-vs-long-time-color-scale");
    this.timeColorScale.setTopAsMax(false);
    this.timeColorScale.setInDateMode(true);
    this.timeColorScale.onScaleChange(function(newMin, newMax) {
        var graphsController = this.map.seismicityGraphsController;
        if (graphsController.miniMapColoring === "time") {
            var values = graphsController.features.map(function(feature) {
                return feature.properties.time;
            });
            var chartContainer = "time-slider";

            var minMax = this.mapExtremesToArrayIndeces(newMin, newMax, values);
            graphsController.timeSlider.setNavigatorMin(chartContainer, values[minMax.minIndex]);
            graphsController.timeSlider.setNavigatorMax(chartContainer, values[minMax.maxIndex]);
        }
    }.bind(this));
    this.minMilliseconds = 0;
    this.maxMilliseconds = 0;
    this.gpsStationNamePopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });
}

function setupSeismicityGraphsController() {
    SeismicityGraphsController.prototype.setFeatures = function(features) {
        // make sure they are sorted since datetimes have to be sorted for highcharts
        this.features = features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        this.minMilliseconds = this.features[0].properties.time;
        this.maxMilliseconds = this.features[this.features.length - 1].properties.time;
    };

    SeismicityGraphsController.prototype.setBbox = function(bbox) {
        this.bbox = bbox;
    };

    SeismicityGraphsController.prototype.setMinimapColoring = function(coloring) {
        this.miniMapColoring = coloring;
        this.createChart(null, "lat-vs-long-graph", null, null);
    };

    SeismicityGraphsController.prototype.getSeriesData = function(xValues, yValues, extraFeatureData, colorOnInputs, colorStops) {
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

                if (extraFeatureData) {
                    seriesData[i].extraData = extraFeatureData[i];
                }
            }
        } else {
            for (var i = 0; i < xValues.length; i++) {
                seriesData.push([xValues[i], yValues[i]]);
            }
        }

        return seriesData;
    };

    SeismicityGraphsController.prototype.getDepthVLongData = function(features, selectedColoring) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });
        var htmls = [];
        var longValues = features.map(function(feature) {
            htmls.push(this.map.thirdPartySourcesController.featureToViewOptions(feature));
            return feature.geometry.coordinates[0];
        }.bind(this));
        var millisecondValues = features.map(function(feature) {
            return feature.properties.time;
        });
        var min = millisecondValues[0];
        var max = millisecondValues[millisecondValues.length - 1];

        var colorOnInputs = millisecondValues;
        var stopsCalculator = new MapboxStopsCalculator();

        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.colorScale.jet);

        return this.getSeriesData(longValues, depthValues, htmls, colorOnInputs, colorStops);
    };

    SeismicityGraphsController.prototype.getMinimapBounds = function() {
        if (this.mapForPlot) {
            return this.mapForPlot.getBounds();
        }

        return null;
    };

    SeismicityGraphsController.prototype.pointFormatterCallback = function() {
        return this.point.extraData.html;
    };

    SeismicityGraphsController.prototype.createDepthVLongGraph = function(features, chartContainer, selectedColoring) {
        var depthVLongValues = this.getDepthVLongData(features, selectedColoring);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.xAxis.title = { text: "Longitude" };
        chartOpts.yAxis.title = { text: "Depth (Km)" };
        chartOpts.yAxis.labels = { format: "{value:.1f}" };
        chartOpts.yAxis.reversed = true;
        chartOpts.tooltip = {
            formatter: this.pointFormatterCallback
        };
        chartOpts.chart.spacing = [0, 0, 0, -5];

        // if minimap is created, set min and max chart axis according to bounds of plot
        if (this.mapForPlot) {
            var bounds = this.mapForPlot.getBounds();
            var minLng = bounds._sw.lng;
            var maxLng = bounds._ne.lng;
            chartOpts.xAxis.max = maxLng;
            chartOpts.xAxis.min = minLng;
            chartOpts.xAxis.endOnTick = false;
            chartOpts.xAxis.startOnTick = false;
            chartOpts.xAxis.maxPadding = 0;
        }
        // save it before we save the data to series
        this.highChartsOpts[chartContainer] = chartOpts;
        chartOpts.series.push({
            type: 'scatter',
            name: 'Depth',
            data: depthVLongValues,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        this.createChartDestroyingOld(chartContainer, chartOpts);

        return depthVLongValues;
    };

    SeismicityGraphsController.prototype.getLatVDepthData = function(features, selectedColoring) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });
        var htmls = [];
        var latValues = features.map(function(feature) {
            htmls.push(this.map.thirdPartySourcesController.featureToViewOptions(feature));
            return feature.geometry.coordinates[1];
        }.bind(this));

        var millisecondValues = features.map(function(feature) {
            return feature.properties.time;
        });
        var min = millisecondValues[0];
        var max = millisecondValues[millisecondValues.length - 1];

        var colorOnInputs = millisecondValues;
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.colorScale.jet);

        return this.getSeriesData(depthValues, latValues, htmls, colorOnInputs, colorStops);
    };
    SeismicityGraphsController.prototype.createLatVDepthGraph = function(features, chartContainer, selectedColoring) {
        var latVdepthValues = this.getLatVDepthData(features, selectedColoring);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.tooltip.pointFormat = "{point.y:.1f} °";
        chartOpts.xAxis.title = { text: "Depth (Km)" };
        chartOpts.yAxis.title = { text: "Latitude" };
        chartOpts.yAxis.labels = { format: "{value:.1f}" };
        chartOpts.tooltip = {
            formatter: this.pointFormatterCallback
        };
        chartOpts.chart.spacing = [5, 0, 10, 0];

        // if minimap is created, set min and max chart axis according to bounds of plot
        if (this.mapForPlot) {
            var bounds = this.mapForPlot.getBounds();
            var minLat = bounds._sw.lat;
            var maxLat = bounds._ne.lat;
            chartOpts.yAxis.max = maxLat;
            chartOpts.yAxis.min = minLat;
            chartOpts.yAxis.endOnTick = false;
            chartOpts.yAxis.startOnTick = false;
            chartOpts.yAxis.maxPadding = 0;
        }

        // save it before we push the data to series
        this.highChartsOpts[chartContainer] = chartOpts;
        chartOpts.series.push({
            type: 'scatter',
            name: 'Lat',
            data: latVdepthValues,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        this.createChartDestroyingOld(chartContainer, chartOpts);

        return latVdepthValues;
    };

    SeismicityGraphsController.prototype.getHistogram = function(input) {
        const NUM_BINS = 100.0; // he said he wanted 100 bins
        var min = input[0];
        var max = input[input.length - 1];
        var increment = (max - min) / NUM_BINS;
        var stopsCalculator = new MapboxStopsCalculator();
        var bins = stopsCalculator.inputsFromMinAndMax(min, max, increment);

        var amountAtEachBin = new Uint8Array(bins.length);
        var binIndex = 0;
        for (var i = 0; i < input.length; i++) {
            var bin = bins[binIndex];
            var depth = input[i];
            if (depth <= bin) {
                amountAtEachBin[binIndex]++;
            } else {
                amountAtEachBin[++binIndex]++;
            }
        }

        return { x: bins, y: amountAtEachBin };
    };

    SeismicityGraphsController.prototype.getCumulativeEventsVDayData = function(features, selectedColoring) {
        var htmls = [];
        var xValues = features.map(function(feature) {
            htmls.push(this.map.thirdPartySourcesController.featureToViewOptions(feature));
            return feature.properties.time;
        }.bind(this));

        var yValues = null;
        if (switchToDistributionToggleButton.toggleState == ToggleStates.ON) {
            var histogram = this.getHistogram(xValues);
            yValues = histogram.y;
            xValues = histogram.x;
            return this.getSeriesData(xValues, yValues);
        }
        yValues = features.map(function(feature, index, array) {
            return index + 1;
        });


        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });

        var colorOnInputs = depthValues;
        var min = this.depthColorScale.min;
        var max = this.depthColorScale.max;

        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getDepthStops(min, max, this.map.colorScale.jet_r);

        return this.getSeriesData(xValues, yValues, htmls, colorOnInputs, colorStops);
    };

    SeismicityGraphsController.prototype.createCumulativeEventsVDayGraph = function(features, chartContainer, selectedColoring) {
        var millisecondValues = features.map(function(feature) {
            return feature.properties.time;
        });

        var minDate = new Date(millisecondValues[0]);
        var maxDate = new Date(millisecondValues[millisecondValues.length - 1]);
        var minDateString = minDate.toLocaleDateString();
        var maxDateString = maxDate.toLocaleDateString();

        // if main map is in date mode coloring, use its values for our colorscale
        if (this.map.colorScale.inDateMode) {
            var min = this.map.colorScale.min;
            var max = this.map.colorScale.max;
            this.timeColorScale.setMinMax(min, max);
        } else {
            this.timeColorScale.setMinMax(minDate.getTime(), maxDate.getTime());
        }

        var data = this.getCumulativeEventsVDayData(features, selectedColoring);
        var chartOpts = this.getBasicChartJSON();
        chartOpts.subtitle = { text: "Cumulative Number of Events " + minDateString + " - " + maxDateString };
        chartOpts.tooltip.pointFormat = "{point.y} Events";
        chartOpts.xAxis.type = "datetime";
        chartOpts.xAxis.dateTimeLabelFormats = { month: '%b %Y', year: '%Y' };
        chartOpts.yAxis.title = { text: "Cumulative Number" };
        chartOpts.tooltip = {
            formatter: this.pointFormatterCallback
        };
        // save it before we push the data to series
        this.highChartsOpts[chartContainer] = chartOpts;

        chartOpts.series.push({
            type: 'scatter',
            name: 'Cumulative',
            data: data,
            marker: {
                enabled: true
            },
            showInLegend: false,
        });

        this.createChartDestroyingOld(chartContainer, chartOpts);

        return data;
    };

    SeismicityGraphsController.prototype.createLatVLongGraph = function(features, chartContainer, selectedColoring, bounds) {
        if (this.mapForPlot) {
            this.mapForPlot.remove();
        }
        // below function has nice side effect of putting vertices in
        // nw, ne, se, sw order. we can use this fact to get bounds in sw, ne
        // order as mapbox requires.
        bounds = this.map.selector.getVerticesOfSquareBbox(bounds);
        var sanitizedBounds = [bounds[3], bounds[1]]; // sw, ne

        this.mapForPlot = new mapboxgl.Map({
            container: chartContainer, // container id
            attributionControl: false,
            maxBounds: sanitizedBounds
        });

        $("#" + chartContainer).hover(function() {
            $("#seismicity-charts").draggable("disable");
        }, function() {
            $("#seismicity-charts").draggable("enable");
        });

        this.mapForPlot.on("load", function() {
            this.mapForPlot.getCanvas().style.cursor = 'auto';
            this.mapForPlot.setMaxBounds(null); // allow us to pan and drag outside constrained bounds
            var scale = null;
            var scaleColors = null;
            if (this.miniMapColoring === "depth") {
                scale = this.depthColorScale;
                scaleColors = this.depthColorScale.jet_r;
            } else if (this.miniMapColoring === "time") {
                scale = this.timeColorScale;
                scaleColors = this.timeColorScale.jet;
            } else {
                throw new Error("Invalid coloring " + this.miniMapColoring + " selected");
            }
            var min = scale.min;
            var max = scale.max;

            var stopsCalculator = new MapboxStopsCalculator();
            var coloringStops = stopsCalculator.getDepthStops(min, max, scaleColors);

            var magCircleSizes = this.map.thirdPartySourcesController.defaultCircleSizes();
            var stopsCalculator = new MapboxStopsCalculator();
            var magStops = stopsCalculator.getMagnitudeStops(4, 10, magCircleSizes);

            var layerID = "LatVLongPlotPoints";
            var mapboxStationFeatures = {
                type: "geojson",
                cluster: false,
                data: {
                    "type": "FeatureCollection",
                    "features": features
                }
            };
            this.mapForPlot.addSource(layerID, mapboxStationFeatures);
            this.mapForPlot.addLayer({
                "id": layerID,
                "type": "circle",
                "source": layerID,
                "paint": {
                    "circle-color": {
                        "property": this.miniMapColoring,
                        "stops": coloringStops,
                        "type": "interval"
                    },
                    "circle-radius": {
                        "property": "mag",
                        "stops": magStops,
                        "type": "interval"
                    }
                }
            });
        }.bind(this));
        this.mapForPlot.on('mousemove', function(e) {
            var features = this.mapForPlot.queryRenderedFeatures(e.point);
            // mouse not under a marker, clear all popups
            if (!features.length) {
                this.gpsStationNamePopup.remove();
                this.mapForPlot.getCanvas().style.cursor = 'auto';
                return;
            }
            var featureViewOptions = this.map.thirdPartySourcesController.featureToViewOptions(features[0]);
            if (featureViewOptions.coordinates) {
                var html = "<span style='font-size: 8px'>" + featureViewOptions.html + "</span>";
                this.gpsStationNamePopup.setLngLat(featureViewOptions.coordinates)
                    .setHTML(html)
                    .addTo(this.mapForPlot);
            }
            this.mapForPlot.getCanvas().style.cursor = featureViewOptions.cursor;
        }.bind(this));
        var onMoveend = function(e) {
            // we could just call setData... but screw it.
            // this is less efficient, but it's more abstract, short, and easier to code
            // if efficiency needed, setData can be used, but for now, that is premature micro-optimization
            // so, we recreate plots.
            this.map.selector.removeSelectionPolygon();
            var bounds = this.mapForPlot.getBounds();
            this.map.selector.addSelectionPolygonFromMapBounds(bounds);
            var layerIDS = this.map.getLayerIDsInCurrentMode();
            var sanitizedBounds = [bounds._sw, bounds._ne];
            var features = this.getFeaturesWithinCurrentSliderRanges(this.features);
            this.map.selector.createSeismicityPlots(layerIDS, sanitizedBounds);
        }.bind(this);
        this.mapForPlot.on("zoomend", onMoveend);
        this.mapForPlot.on("dragend", onMoveend);
        var styleAndLayer = this.map.getMapBaseStyle("mapbox.streets");
        this.mapForPlot.setStyle(styleAndLayer.style);
    };

    SeismicityGraphsController.prototype.createAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        if ($("#seismicity-charts").hasClass("active")) {
            // create mini map first so other charts can set their min and max axes values as appropriate
            this.createChart(selectedColoring, "lat-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "depth-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "lat-vs-depth-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "cumulative-events-vs-date-graph", optionalFeatures, optionalBounds);
            this.depthColorScale.initVisualScale();
            this.timeColorScale.initVisualScale();
        }

        if ($("#cross-section-charts").hasClass("active")) {
            this.createCrossSectionChart(selectedColoring, "depth-vs-long-graph", optionalFeatures, optionalBounds);
            this.createCrossSectionChart(selectedColoring, "lat-vs-depth-graph", optionalFeatures, optionalBounds);
        }
    };

    SeismicityGraphsController.prototype.createChart = function(selectedColoring, chartType, optionalFeatures, optionalBounds) {
        var features = optionalFeatures;
        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }

        var bounds = optionalBounds;
        if (!bounds) {
            bounds = this.bbox;
            if (!bounds) {
                return;
            }
        }

        var chartData = null;
        if (chartType === "depth-vs-long-graph") {
            chartData = this.createDepthVLongGraph(features, "depth-vs-long-graph", selectedColoring);
        } else if (chartType === "lat-vs-depth-graph") {
            chartData = this.createLatVDepthGraph(features, "lat-vs-depth-graph", selectedColoring);
        } else if (chartType === "cumulative-events-vs-date-graph") {
            chartData = this.createCumulativeEventsVDayGraph(features, "cumulative-events-vs-date-graph", selectedColoring);
        } else if (chartType === "lat-vs-long-graph") {
            chartData = this.createLatVLongGraph(features, "lat-vs-long-graph", selectedColoring, bounds);
        } else {
            throw new Error("Unrecognized chart type " + chartType);
        }

        return chartData;
    };

    SeismicityGraphsController.prototype.createCrossSectionChart = function(selectedColoring, chartType, optionalFeatures, optionalBounds) {
        var features = optionalFeatures;
        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }

        var bounds = optionalBounds;
        if (!bounds) {
            bounds = this.bbox;
            if (!bounds) {
                return;
            }
        }

        var chartData = null;
        if (chartType === "depth-vs-long-graph") {
            chartData = this.createDepthVLongGraph(features, "cross-section-depth-vs-long-graph", selectedColoring);
        } else if (chartType === "lat-vs-depth-graph") {
            chartData = this.createLatVDepthGraph(features, "cross-section-lat-vs-depth-graph", selectedColoring);
        } else {
            throw new Error("Unrecognized chart type " + chartType);
        }

        return chartData;
    };

    SeismicityGraphsController.prototype.destroyAllCharts = function() {
        if ($("#seismicity-charts").hasClass("active")) {
            if (this.mapForPlot) {
                this.mapForPlot.remove();
                this.mapForPlot = null;
            }
            $("#depth-vs-long-graph").highcharts().destroy();
            $("#lat-vs-depth-graph").highcharts().destroy();
            $("#cumulative-events-vs-date-graph").highcharts().destroy();
        }

        if ($("#cross-section-charts").hasClass("active")) {
            $("#cross-section-depth-vs-long-graph").highcharts().destroy();
            $("#cross-section-lat-vs-depth-graph").highcharts().destroy();
        }
    };

    SeismicityGraphsController.prototype.recreateAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        this.destroyAllCharts();
        this.createAllCharts(selectedColoring, optionalBounds, optionalFeatures);
    };
}

function CustomHighchartsSlider() {}

function setupCustomHighchartsSlider() {
    CustomHighchartsSlider.prototype.init = function(height, afterSetExtremes) {
        var chartOpts = this.getBasicChartJSON();
        chartOpts.credits = false;
        chartOpts.chart = {
            margin: [0, 5, 0, 5],
            spacing: [0, 0, 0, 0]
        };
        chartOpts.navigator = {
            enabled: true,
            top: 1,
            xAxis: {
                tickPixelInterval: 50
            }
        };

        if (height) {
            chartOpts.chart.height = height;
            chartOpts.navigator.height = height;
        }

        chartOpts.xAxis = {
            lineWidth: 0,
            tickLength: 0,
            labels: {
                enabled: false
            }
        };
        chartOpts.xAxis.events = {
            // get dates for slider bounds
            afterSetExtremes: afterSetExtremes
        };
        chartOpts.yAxis = {
            labels: {
                enabled: false
            },
            title: null
        };
        chartOpts.rangeSelector = {
            enabled: false
        };
        chartOpts.tooltip = {
            enabled: false
        };

        this.highChartsOpts = chartOpts;
    };

    CustomHighchartsSlider.prototype.display = function(chartContainer, data, dataType, title) {
        var chartOpts = this.highChartsOpts;
        chartOpts.subtitle = {
            text: title
        };
        if (dataType) {
            chartOpts.chart.type = dataType;
            // if linear linear (i.e. when we use depth) it was showing strange formatting
            if (dataType === "linear") {
                chartOpts.navigator.xAxis.labels = {
                    format: "{value}"
                }
            }
        }

        chartOpts.series.push({
            type: 'scatter',
            name: 'Depth',
            data: data,
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: false
                    }
                }
            },
            showInLegend: false,
        });

        this.createChartDestroyingOld(chartContainer, chartOpts);
        $("#" + chartContainer).css("height", chartOpts.chart.height + "px");
        this.setNavigatorHandlers(chartContainer, "seismicity-chart-sliders");
    };
}

function CustomSliderSeismicityController() {
    this.timeRange = null;
    this.depthRange = null;
    this.depthSlider = null;
    this.timeSlider = null;
}

function setupCustomSliderSeismicityController() {
    CustomSliderSeismicityController.prototype.getDepthVDepthData = function(features, selectedColoring) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });

        var min = depthValues[0];
        var max = depthValues[depthValues.length - 1];

        var colorOnInputs = depthValues;
        var stopsCalculator = new MapboxStopsCalculator();

        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.colorScale.jet);

        return this.getSeriesData(depthValues, depthValues, null, colorOnInputs, colorStops);
    };
    CustomSliderSeismicityController.prototype.getFeaturesWithinCurrentSliderRanges = function(features) {
        var filteredFeatures = features.filter(function(feature) {
            var props = feature.properties;
            var time = props.time;
            var depth = props.depth;

            var withinTimeRange = false;
            var withinDepthRange = false;
            if (this.timeRange) {
                withinTimeRange = (time >= this.timeRange.min && time <= this.timeRange.max);
            } else {
                // no time range so we are within time range
                withinTimeRange = true;
            }

            if (this.depthRange) {
                withinDepthRange = (depth >= this.depthRange.min && depth <= this.depthRange.max);
            } else {
                // no depth range so we are within depth range
                withinDepthRange = true;
            }

            return withinTimeRange && withinDepthRange;
        }.bind(this));

        return filteredFeatures;
    };
    // slider creation is coupled to chart creation to avoid having to process data twice.
    // also, we depend on mapbox's query rendered features for filtering features in graphs.
    // we could write our own filering code, but there is no point as mapbox filters for us and
    // these graphs are so intimately tied to the map features
    CustomSliderSeismicityController.prototype.depthSliderCallback = function(e, depthValues) {
        var minMax = this.mapExtremesToArrayIndeces(e.min, e.max, depthValues);
        var min = depthValues[minMax.minIndex];
        var max = depthValues[minMax.maxIndex];

        this.depthRange = { min: min, max: max };
        this.map.thirdPartySourcesController.filterSeismicities([this.depthRange], "depth");
        var filteredFeatures = this.getFeaturesWithinCurrentSliderRanges(this.features);
        // call super method to not recreate sliders
        SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, filteredFeatures);
    };

    CustomSliderSeismicityController.prototype.timeSliderCallback = function(e, millisecondValues) {
        var minMax = this.mapExtremesToArrayIndeces(e.min, e.max, millisecondValues);
        var min = millisecondValues[minMax.minIndex];
        var max = millisecondValues[minMax.maxIndex];

        this.timeRange = { min: min, max: max };
        this.map.thirdPartySourcesController.filterSeismicities([this.timeRange], "time");
        var filteredFeatures = this.getFeaturesWithinCurrentSliderRanges(this.features);
        // call super method to not recreate sliders
        SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, filteredFeatures);
    };

    CustomSliderSeismicityController.prototype.getDepthHistogram = function(features) {
        var depthValues = features.map(function(feature) {
            return feature.properties.depth;
        });

        // make sure it is sorted
        depthValues.sort(function(depth1, depth2) {
            return depth1 - depth2;
        });

        var histogram = this.getHistogram(depthValues);
        var amountAtEachBin = histogram.y;
        var bins = histogram.x;

        return this.getSeriesData(bins, amountAtEachBin, null, null, null);
    };

    CustomSliderSeismicityController.prototype.getEventsHistogram = function(features) {
        var millisecondValues = features.map(function(feature) {
            return feature.properties.time;
        });

        // make sure it is sorted
        millisecondValues.sort(function(time1, time2) {
            return time1 - time2;
        });

        var histogram = this.getHistogram(millisecondValues);
        var amountAtEachBin = histogram.y;
        var bins = histogram.x;

        return this.getSeriesData(bins, amountAtEachBin, null, null, null);
    };

    CustomSliderSeismicityController.prototype.createAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        var millisecondData = null;

        if ($("#seismicity-charts").hasClass("active")) {
            // create mini map first so other charts can set their min and max axes values as appropriate
            this.createChart(selectedColoring, "lat-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "depth-vs-long-graph", optionalFeatures);
            this.createChart(selectedColoring, "lat-vs-depth-graph", optionalFeatures);
            millisecondData = this.createChart(selectedColoring, "cumulative-events-vs-date-graph", optionalFeatures);
            this.depthColorScale.initVisualScale();
            this.timeColorScale.initVisualScale();
        }

        if ($("#cross-section-charts").hasClass("active")) {
            this.createCrossSectionChart(selectedColoring, "depth-vs-long-graph", optionalFeatures, optionalBounds);
            this.createCrossSectionChart(selectedColoring, "lat-vs-depth-graph", optionalFeatures, optionalBounds);
        }

        var features = optionalFeatures;
        if (!features) {
            features = this.features;
            if (!features) {
                return;
            }
        }

        var depthData = this.getDepthHistogram(features);
        var millisecondData = this.getEventsHistogram(features);

        var depthValues = [];
        var millisecondValues = [];

        features.forEach(function(feature) {
            depthValues.push(feature.properties.depth);
            millisecondValues.push(feature.properties.time);
        });

        // need to sort depth values as highcharts requires charts with navigator to have sorted data (else get error 15).
        // also, callbacks depend on sorted arrays (for speed). no need to sort milliseconds as the features are already sorted by this
        depthValues.sort(function(depth1, depth2) {
            return depth1 - depth2;
        });

        this.depthSlider = this.createSlider("depth-slider", depthData, "linear", null, function(e) {
            this.depthSliderCallback(e, depthValues);
        }.bind(this));
        this.timeSlider = this.createSlider("time-slider", millisecondData, "datetime", null, function(e) {
            this.timeSliderCallback(e, millisecondValues);
        }.bind(this));
    };
    CustomSliderSeismicityController.prototype.createSlider = function(sliderContainer, data, dataType, title, afterSetExtremes) {
        var slider = new CustomHighchartsSlider();
        slider.init(null, afterSetExtremes.bind(this));
        slider.display(sliderContainer, data, dataType, title);

        return slider;
    };

    CustomSliderSeismicityController.prototype.destroyAllSliders = function() {
        $("#depth-slider").highcharts().destroy();
        $("#time-slider").highcharts().destroy();
    };

    CustomSliderSeismicityController.prototype.slidersVisible = function() {
        return $("#seismicity-chart-sliders").hasClass("active");
    };

    CustomSliderSeismicityController.prototype.chartsVisible = function() {
        return $("#seismicity-charts").hasClass("active");
    };

    CustomSliderSeismicityController.prototype.showSliders = function() {
        var $sliderContainer = $("#seismicity-chart-sliders");
        if (!$sliderContainer.hasClass("active")) {
            $("#seismicity-chart-sliders-maximize-button").click();
        }
    };

    CustomSliderSeismicityController.prototype.showCharts = function() {
        var $chartContainer = $("#seismicity-charts");
        if (!$chartContainer.hasClass("active")) {
            $("#seismicity-charts-maximize-button").click();
        }
    };

    CustomSliderSeismicityController.prototype.showChartContainers = function() {
        this.showSliders();
        this.showCharts();
    };

    CustomSliderSeismicityController.prototype.hideChartContainers = function() {
        var $chartContainer = $("#seismicity-charts");
        if ($chartContainer.hasClass("active")) {
            $("#seismicity-charts-minimize-button").click();
        }

        var $sliderContainer = $("#seismicity-chart-sliders");
        if ($sliderContainer.hasClass("active")) {
            $("#seismicity-chart-sliders-minimize-button").click();
        }

        var $sliderContainer = $("#cross-section-charts");
        if ($sliderContainer.hasClass("active")) {
            $("#cross-section-charts-minimize-button").click();
        }
    };

    // an alternative would be to keep slider pointers with their associated data and just
    // use highcharts constructor to update sliders. we create anew because this highcharts
    // constructor used to have bugs (see: https://forum.highcharts.com/post126503.html#p126503),
    // and although they've now fixed it, we want to remain consistent with our other graph code.
    // In the future, someone can use the constructor functions to update graphs rather than creating anew every time.
    CustomSliderSeismicityController.prototype.zoomSlidersToCurrentRange = function() {
        var pixelBoundingBox = [this.map.map.project(this.bbox[0]), this.map.map.project(this.bbox[1])];
        var seismicityLayerIDs = this.map.getLayerIDsInCurrentMode();
        var allFeatures = this.map.map.queryRenderedFeatures(pixelBoundingBox, { layers: seismicityLayerIDs });
        var features = this.map.selector.getUniqueFeatures(allFeatures);

        features = features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        this.createAllCharts(null, null, features);
    };

    // override
    CustomSliderSeismicityController.prototype.setMinimapColoring = function(coloring) {
        this.miniMapColoring = coloring;
        var values = null;
        var scale = null;
        var chartContainer = null;

        if (coloring === "time") {
            values = this.features.map(function(feature) {
                return feature.properties.time;
            });
            scale = this.timeColorScale;
            chartContainer = "time-slider";
        } else if (coloring === "depth") {
            values = this.features.map(function(feature) {
                return feature.properties.depth;
            });
            scale = this.depthColorScale;
            chartContainer = "depth-slider";
        } else {
            throw new Error("Invalid coloring " + coloring + " selected");
        }

        var minMax = this.mapExtremesToArrayIndeces(scale.min, scale.max, values);
        this.timeSlider.setNavigatorMin(chartContainer, values[minMax.minIndex]);
        this.timeSlider.setNavigatorMax(chartContainer, values[minMax.maxIndex]);
    };

    CustomSliderSeismicityController.prototype.resetSliderRanges = function() {
        this.map.thirdPartySourcesController.removeSeismicityFilters();
        // this avoids us having to keep all the features in memory for when we reset
        // we can use map queryRenderedFeatures instead once all features are rendered
        // after applying filter
        this.map.onDatasetRendered(function(callback) {
            this.map.map.off("render", callback);
            this.createAllCharts(null, null, null);
        }.bind(this));
    };
}
