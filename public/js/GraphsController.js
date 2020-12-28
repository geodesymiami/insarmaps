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
    this.getValidDatesFromNavigatorExtremes = function(chartContainer) {
        var graphSettings = this.graphSettings[chartContainer];

        var minDate = graphSettings.navigatorEvent.min;
        var maxDate = graphSettings.navigatorEvent.max;
        var minMax = this.mapExtremesToArrayIndeces(minDate, maxDate, graphSettings.date_array);

        return minMax;
    };

    this.setNavigatorHandlers = function(chartID, divIDDisableDraggable) {
        $("#" + chartID + " .highcharts-navigator").mouseenter(function() {
            $(divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $(divIDDisableDraggable).draggable("enable");
        });;
        $("#" + chartID + ".highcharts-navigator-handle-left").mouseenter(function() {
            $(divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $(divIDDisableDraggable).draggable("enable");
        });;
        $("#" + chartID + ".highcharts-navigator-handle-right").mouseenter(function() {
            $(divIDDisableDraggable).draggable("disable");
        }).mouseleave(function() {
            $(divIDDisableDraggable).draggable("enable");
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

    this.setNavigatorMinMax = function(chartContainer, min, max) {
        var chart = $("#" + chartContainer).highcharts();

        if (!chart) {
            return;
        }
        chart.xAxis[0].setExtremes(min, max);
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
                events: {
                    load: function() {
                        chartOpts.loaded = true;
                    }
                }
            },
            exporting: {
                enabled: false
            },
            plotOptions: {
                series: {
                    turboThreshold: 0
                }
            },
            loaded: false
        };

        return chartOpts;
    };

    this.chartExists = function(chartContainer) {
        var chart = $("#" + chartContainer).highcharts();

        return  chart !== null && chart !== undefined;
    };

    this.destroyChart = function(chartContainer) {
        if (this.chartExists(chartContainer)) {
            $("#" + chartContainer).highcharts().destroy();
        }
    };

    this.createChartDestroyingOld = function(chartContainer, chartOpts) {
        this.destroyChart(chartContainer);

        $("#" + chartContainer).highcharts(chartOpts);
    };

    this.createChartNotDestroyingOld = function(chartContainer, chartOpts) {
        Highcharts.chart(chartContainer, chartOpts);
    };

    this.createSlider = function(sliderContainer, data, dataType, title, afterSetExtremes) {
        var slider = new CustomHighchartsSlider();
        slider.init(null, afterSetExtremes.bind(this));
        slider.display(sliderContainer, data, dataType, title);

        return slider;
    };
}

// TODO: no idea why this isn't working. Even after trying many hacks due to the bug mentioned at the github link
// below, it still doesn't work. Basically, the array I return from this function is still sometimes modified
// by highcharts to contain only one value - the average of all the values of the array I supplied. No idea why...
// the strange thing is that calling console.log shows the array being modified BEFORE it is even returned
// from the function. just the fact that is returned after the console.log triggers this strange behavior. returning
// any other array and then the array we build up isn't modified... so there is a very strange race condition
// type of thing going on here and should open an issue on highcharts github
function tickPositionerCallback() {
    return this.tickPositions;
    // without first line, sometimes these two numbers don't match
    // no idea why - this is all a hack after all, see below comment
    console.log(this.tickPositions.length);
    console.log(this.tickPositions);
    var ticks = [];
    this.tickPositions.forEach(function(tickPosition) {
        ticks.push(tickPosition);
    });
    ticks.info = {
        unitName: this.tickPositions.info.unitName,
        higherRanks: []
    };

    if (ticks.length == 1) {
        // TODO: the ticks.info line is a hack due a to bug in Highcharts
        // see: https://github.com/highcharts/highcharts/issues/6467
        // and http://jsfiddle.net/oun5jmq7/2/
        // the ticks.info line might not be needed when and if they fix this
        var endTick = this.dataMax + ((this.dataMax - this.dataMin) * 0.01);
        ticks = [this.dataMin, this.dataMax];
        //ticks.info = this.tickPositions.info;

        console.log("GONNA RETURN BEFORE IF LENGTH OF " + ticks.length);
        console.log(ticks);
        return ticks;
    }

    console.log("GONNA RETURN AFTER IF LENGTH OF " + ticks.length);
    console.log(ticks);
    // if its empty or 1 entry, it is not modified. if its > 1 entry, it is modified to contain one value only -
    // the value of the average of all the values I defined...
    var empty = [2, 4];
    console.log("EMPTY");
    console.log(empty);

    return empty;
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

    this.insarTimeSlider = null;
}

// for the below class, we always destroy and recreate the chart.
// highcharts used to have a bug when updating series: (see: https://forum.highcharts.com/post126503.html#p126503),
// so we took this approach. However, this bug seems to have been fixed (see jsfiddle on this site which now works),
// TODO: so, in the future, consider updating this class instead of destroying and recreating. not doing now as it seems
// like waste of time when there are bigger fish to fry. Update: seismicity plots and sliders have been updated, need to update
// just the main insar plot class (GraphsController)
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

    GraphsController.prototype.JSONToGraph = function(area, json, chartContainer, clickEvent) {
        var date_string_array = json.string_dates;
        var date_array = convertStringsToDateArray(date_string_array);
        var decimal_dates = json.decimal_dates;
        // convert from m to cm
        var displacement_array = json.displacements.map(function(displacement) {
            return 100 * displacement;
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
        var velocity_std = getStandardDeviation(displacement_array, slope, y, decimal_dates);

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
                text: unavcoNameToShorterName(currentArea),
                style: {
                    "font-size": "10px"
                }
            },
            subtitle: {
                text: "velocity: " + (slope * 10).toFixed(2).toString() + " mm/yr,  v_std: " + (velocity_std * 10).toFixed(2).toString() + " mm/yr"
            },
            navigator: {
                enabled: true,
                xAxis: {
                    tickPositioner: tickPositionerCallback
                }
            },
            scrollbar: {
                liveRedraw: false
            },
            xAxis: {
                type: 'datetime',
                events: { // get dates for slider bounds
                    afterSetExtremes: function(e) {
                        this.insarTimeSlider.dontPerformAfterSetExtremes = true;
                        this.insarTimeSlider.setMinMax(e.min, e.max); // update insarTimeSlider in case it must be reshown
                        this.insarTimeSlider.dontPerformAfterSetExtremes = false;
                        // we get called when graph is created
                        this.graphSettings[chartContainer].navigatorEvent = e;
                        appendUrlVar(/&minDate=-?\d*\.?\d*/, "&minDate=" + new Date(e.min).yyyymmdd());
                        appendUrlVar(/&maxDate=-?\d*\.?\d*/, "&maxDate=" + new Date(e.max).yyyymmdd());
                        var dates = this.getValidDatesFromNavigatorExtremes(chartContainer);
                        this.map.selector.lastMinIndex = this.map.selector.minIndex;
                        this.map.selector.lastMaxIndex = this.map.selector.maxIndex;
                        // set selector to work
                        this.map.selector.minIndex = dates.minIndex;
                        this.map.selector.maxIndex = dates.maxIndex;

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
                        this.recolorInsarFromDates(e, date_array);
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
                    text: 'LOS Displacement<br>[cm]'
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
                            var minDate = chartData[e.point.index][0];
                            this.setNavigatorMin(chartContainer, minDate);
                        } else {
                            var maxDate = chartData[e.point.index][0];
                            this.setNavigatorMax(chartContainer, maxDate);
                        }
                        lastPointClicked = e.point.index;

                    }.bind(this)
                }
            }],
            chart: {
                marginRight: 50,
                events: {
                    load: function(e) {
                        chartOpts.loaded = true;
                        if (urlOptions) {
                            // need a set timeout or it doesn't work... thanks highcharts
                            window.setTimeout(function() {
                                var minDate = urlOptions.startingDatasetOptions.minDate;
                                var maxDate = urlOptions.startingDatasetOptions.maxDate;
                                if (minDate && maxDate) {
                                    var minDate = yyyymmddToDate(minDate).getTime();
                                    var maxDate = yyyymmddToDate(maxDate).getTime();
                                    var minDate = new Date(minDate).getTime();
                                    var maxDate = new Date(maxDate).getTime();
                                    this.map.graphsController.setNavigatorMinMax("chartContainer", minDate, maxDate);
                                    delete urlOptions.startingDatasetOptions.minDate;
                                    delete urlOptions.startingDatasetOptions.maxDate;
                                }
                            }.bind(this), 1000);
                        }
                    }.bind(this)
                }
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

        this.setNavigatorHandlers(chartContainer, "#charts");

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
        var validDates = this.getValidDatesFromNavigatorExtremes(
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
        var stdDev = getStandardDeviation(sub_displacements, sub_slope, sub_y, sub_decimal_dates);

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
        $("#hide-when-only-show-sliders").height("100%");
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
        $("#hide-when-only-show-sliders").height("auto");
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

        this.setNavigatorHandlers("chartContainer", "#charts");
        this.setNavigatorHandlers("chartContainer2", "#charts");

    };

    GraphsController.prototype.recolorInsarFromDates = function(e, dates) {
        var selector = this.map.selector;
        if (selector.minIndex != -1 && selector.maxIndex != -1) {
            if (this.map.colorOnDisplacement) {
                var startDate = new Date(dates[this.map.selector.minIndex]);
                var endDate = new Date(dates[this.map.selector.maxIndex]);
                this.map.selector.recolorOnDisplacement(startDate, endDate, "Recoloring...", "ESCAPE or click/tap this box to interrupt");
            } else {
                this.map.selector.recolorDataset();
            }

            var timeSlider = this.map.seismicityGraphsController.timeSlider;
            if (timeSlider) {
                timeSlider.setMinMax(e.min, e.max);
            }
        }
    };

    GraphsController.prototype.createInsarSliderForDataset = function(area) {
        var controller = new AreaAttributesController(null, area);
        var date_string_array = controller.getAttribute("string_dates");
        var date_array = convertStringsToDateArray(date_string_array);
        // console.log(JSON.stringify(date_array));
        var data = date_array.map(function(date) {
            return [date.getTime(), 1];
        });
        // console.log(JSON.stringify(data));

        this.insarTimeSlider = this.createSlider("insar-chart-slider", data, "datetime", "Date", function(e) {
            // don't recolor twice when main color scale updates this slider...
            if (this.insarTimeSlider.dontPerformAfterSetExtremes) {
                return;
            }
            var dates = this.mapExtremesToArrayIndeces(e.min, e.max, date_array);
            this.map.selector.lastMinIndex = myMap.selector.minIndex;
            this.map.selector.lastMaxIndex = myMap.selector.maxIndex;
            // set selector to work
            this.map.selector.minIndex = dates.minIndex;
            this.map.selector.maxIndex = dates.maxIndex;

            this.recolorInsarFromDates(e, date_array);
        }.bind(this));

        this.setNavigatorHandlers("insar-chart-slider", "#charts");
    };

    GraphsController.prototype.destroyGraphs = function() {
        this.destroyChart("chartContainer");
        this.destroyChart("chartContainer2");
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
        graphsController.depthSlider.setMinMax(newMin, newMax);
    }.bind(this));
    this.timeColorScale = new ColorScale(new Date(0).getTime(), new Date(50).getTime(), "lat-vs-long-time-color-scale");
    this.timeColorScale.setTopAsMax(false);
    this.timeColorScale.setInDateMode(true);
    this.timeColorScale.onScaleChange(function(newMin, newMax) {
        var graphsController = this.map.seismicityGraphsController;
        graphsController.timeSlider.setMinMax(newMin, newMax);
    }.bind(this));
    this.crossSectionDepthColorScale = new ColorScale(0, 50, "cross-section-depth-color-scale");
    this.crossSectionDepthColorScale.setTopAsMax(false);
    this.crossSectionTimeColorScale = new ColorScale(new Date(0).getTime(), new Date(50).getTime(), "cross-section-time-color-scale");
    this.crossSectionTimeColorScale.setTopAsMax(false);
    this.crossSectionTimeColorScale.setInDateMode(true);
    this.timeRange = null;
    this.depthRange = null;
    this.gpsStationNamePopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });
    this.seismicityColorings = {};
}

function setupSeismicityGraphsController() {
    SeismicityGraphsController.prototype.setFeatures = function(features) {
        if (!features) {
            return;
        }
        // make sure they are sorted since datetimes have to be sorted for highcharts
        this.features = features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        // we could have sorted by depth first, then by time (since we ultimately want to keep them sorted
        // by time in memory), but might as well make use of this function since according to stackoverflow it
        // is quickest method, plus it allows us to not necessarily have to sort by depth first...
        var minMax = findMinMaxOfArray(this.features, function(feature1, feature2) {
            return feature1.properties.depth - feature2.properties.depth;
        });
        this.timeRange = { min: this.features[0].properties.time, max: this.features[this.features.length - 1].properties.time };
        this.depthRange = { min: minMax.min.properties.depth, max: minMax.max.properties.depth };

        this.timeColorScale.setMinMax(this.timeRange.min, this.timeRange.max);
        this.depthColorScale.setMinMax(this.depthRange.min, this.depthRange.max);
        this.crossSectionTimeColorScale.setMinMax(this.timeRange.min, this.timeRange.max);
        this.crossSectionDepthColorScale.setMinMax(this.depthRange.min, this.depthRange.max);
        var selectedColoring = null;
        if (this.map.seismicityColorScale.inDateMode) {
            this.map.seismicityColorScale.setMinMax(this.timeRange.min, this.timeRange.max);
            selectedColoring = "time";
        } else {
            this.map.seismicityColorScale.setMinMax(this.depthRange.min, this.depthRange.max);
            selectedColoring = "depth";
        }

        this.map.thirdPartySourcesController.recolorSeismicities(selectedColoring);
    };

    SeismicityGraphsController.prototype.setBbox = function(bbox) {
        this.bbox = bbox;
    };

    SeismicityGraphsController.prototype.getSeriesData = function(features, colorStops, sizeStops) {
        var seriesData = [];

        // we do x, y values if no stops provided to avoid highcharts turbothreshold
        if (features[0].colorOnInput && features[0].sizeOnInput) {
            var stopsCalculator = new MapboxStopsCalculator();

            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                var colorIndex = stopsCalculator.getOutputIndexFromInputStop(colorStops, feature.colorOnInput);
                var sizeIndex = stopsCalculator.getOutputIndexFromInputStop(sizeStops, feature.sizeOnInput);

                var color = colorStops[colorIndex][1];
                var size = sizeStops[sizeIndex][1];
                seriesData.push({
                    x: feature.x,
                    y: feature.y,
                    name: "Point2",
                    color: color,
                    marker: {
                        radius: size
                    }
                });

                if (feature.extraFeatureData) {
                    seriesData[i].extraData = feature.extraFeatureData;
                }
            }
        } else {
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                seriesData.push([feature.x, feature.y]);
            }
        }

        return seriesData;
    };

    SeismicityGraphsController.prototype.getDepthVLongData = function(features, selectedColoring) {
        var seriesFeatures = []

        var min = 0;
        var max = 0;
        var colorOnInputs = null;
        if (selectedColoring === "time") {
            min = this.timeColorScale.min;
            max = this.timeColorScale.max;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.geometry.coordinates[0],
                    y: feature.properties.depth,
                    colorOnInput: feature.properties.time,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };
                // could use custom findMinMaxOfArray function to get min and max
                // by might as well make use of this for loop...
                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        } else { // anything else we assume is depth...
            min = this.depthColorScale.min;
            max = this.depthColorScale.max;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.geometry.coordinates[0],
                    y: feature.properties.depth,
                    colorOnInput: feature.properties.depth,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };

                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        }
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.seismicityColorScale.jet_r);
        var sizeStops = this.map.thirdPartySourcesController.currentSeismicitySizeStops;

        return this.getSeriesData(seriesFeatures, colorStops, sizeStops);
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
        // if minimap is created, set min and max chart axis according to bounds of plot
        // notice if cross section plots are visible, we will short circuit and use long of main map
        var minLng = 0;
        var maxLng = 0;
        if (!this.crossSectionChartsVisible() && this.mapForPlot) {
            var bounds = this.mapForPlot.getBounds();
            minLng = bounds._sw.lng;
            maxLng = bounds._ne.lng;
        } else {
            var bounds = this.map.map.getBounds();
            minLng = bounds._sw.lng;
            maxLng = bounds._ne.lng;
        }
        var curChart = $("#" + chartContainer).highcharts();
        // chart already made, so we simply update it
        if (curChart) {
            curChart.xAxis[0].update({ min: minLng, max: maxLng }, false);
            curChart.series[0].setData(depthVLongValues, true, false, false);
        } else {
            var chartOpts = this.getBasicChartJSON();
            chartOpts.xAxis.title = { text: "Longitude" };
            chartOpts.yAxis.title = { text: "Depth (Km)" };
            chartOpts.yAxis.labels = { format: "{value:.1f}" };
            chartOpts.yAxis.reversed = true;
            chartOpts.tooltip = {
                formatter: this.pointFormatterCallback
            };
            chartOpts.chart.spacing = [5, 0, 0, -5];

            chartOpts.xAxis.max = maxLng;
            chartOpts.xAxis.min = minLng;

            chartOpts.xAxis.endOnTick = false;
            chartOpts.xAxis.startOnTick = false;
            chartOpts.xAxis.maxPadding = 0;
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

            this.createChartNotDestroyingOld(chartContainer, chartOpts);
        }

        return depthVLongValues;
    };

    SeismicityGraphsController.prototype.getLatVDepthData = function(features, selectedColoring) {
        var seriesFeatures = []

        var min = 0;
        var max = 0;
        var colorOnInputs = null;
        if (selectedColoring === "time") {
            min = this.timeColorScale.min;
            max = this.timeColorScale.max;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.properties.depth,
                    y: feature.geometry.coordinates[1],
                    colorOnInput: feature.properties.time,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };
                // could use custom findMinMaxOfArray function to get min and max
                // by might as well make use of this for loop...
                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        } else {
            min = this.depthColorScale.min;
            max = this.depthColorScale.max;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.properties.depth,
                    y: feature.geometry.coordinates[1],
                    colorOnInput: feature.properties.depth,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };

                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        }
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.seismicityColorScale.jet_r);
        var sizeStops = this.map.thirdPartySourcesController.currentSeismicitySizeStops;

        return this.getSeriesData(seriesFeatures, colorStops, sizeStops);
    };
    SeismicityGraphsController.prototype.createLatVDepthGraph = function(features, chartContainer, selectedColoring) {
        var latVdepthValues = this.getLatVDepthData(features, selectedColoring);
        // if minimap is created, set min and max chart axis according to bounds of plot
        // notice if cross section plots are visible, we will short circuit and use long of main map
        var minLat = 0;
        var maxLat = 0;
        if (!this.crossSectionChartsVisible() && this.mapForPlot) {
            var bounds = this.mapForPlot.getBounds();
            minLat = bounds._sw.lat;
            maxLat = bounds._ne.lat;
        } else {
            var bounds = this.map.map.getBounds();
            minLat = bounds._sw.lat;
            maxLat = bounds._ne.lat;
        }
        var curChart = $("#" + chartContainer).highcharts();
        if (curChart) {
            curChart.yAxis[0].update({ min: minLat, max: maxLat }, false);
            curChart.series[0].setData(latVdepthValues, true, false, false);
        } else {
            var chartOpts = this.getBasicChartJSON();
            chartOpts.tooltip.pointFormat = "{point.y:.1f} °";
            chartOpts.xAxis.title = { text: "Depth (Km)" };
            chartOpts.yAxis.title = { text: "Latitude" };
            chartOpts.yAxis.labels = { format: "{value:.1f}" };
            chartOpts.tooltip = {
                formatter: this.pointFormatterCallback
            };
            chartOpts.chart.spacing = [5, 0, 10, 0];

            chartOpts.yAxis.max = maxLat;
            chartOpts.yAxis.min = minLat;

            chartOpts.yAxis.endOnTick = false;
            chartOpts.yAxis.startOnTick = false;
            chartOpts.yAxis.maxPadding = 0;

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
        }

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
        if ($("#switch-to-distribution-button").attr("data-original-title") === "Switch to cumulative") {
            var millisecondValues = features.map(function(feature) {
                return feature.properties.time;
            });
            var histogram = this.getHistogram(millisecondValues);
            var yValues = histogram.y;
            var xValues = histogram.x;
            var seriesFeatures = [];
            for (var i = 0; i < yValues.length; i++) {
                seriesFeatures.push({ x: xValues[i], y: yValues[i] });
            }
            return this.getSeriesData(seriesFeatures);
        }
        var seriesFeatures = []

        var min = 0;
        var max = 0;
        var colorOnInputs = null;
        if (selectedColoring === "time") {
            min = this.timeColorScale.min;
            max = this.timeColorScale.max;
            var numberOfEvents = 1;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.properties.time,
                    y: numberOfEvents,
                    colorOnInput: feature.properties.time,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };
                numberOfEvents++;
                // could use custom findMinMaxOfArray function to get min and max
                // by might as well make use of this for loop...
                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        } else {
            min = this.depthColorScale.min;
            max = this.depthColorScale.max;
            var numberOfEvents = 1;
            features.forEach(function(feature) {
                var html = this.map.thirdPartySourcesController.featureToViewOptions(feature);
                var seriesFeature = {
                    x: feature.properties.time,
                    y: numberOfEvents,
                    colorOnInput: feature.properties.depth,
                    sizeOnInput: feature.properties.mag,
                    extraFeatureData: html
                };
                numberOfEvents++;

                if (seriesFeature.colorOnInput < min) {
                    min = seriesFeature.colorOnInput;
                } else if (seriesFeature.colorOnInput > max) {
                    max = seriesFeature.colorOnInput;
                }
                seriesFeatures.push(seriesFeature);
            }.bind(this));
        }
        var stopsCalculator = new MapboxStopsCalculator();
        var colorStops = stopsCalculator.getTimeStops(min, max, this.map.seismicityColorScale.jet_r);
        var sizeStops = this.map.thirdPartySourcesController.currentSeismicitySizeStops;

        return this.getSeriesData(seriesFeatures, colorStops, sizeStops);
    };

    SeismicityGraphsController.prototype.createCumulativeEventsVDayGraph = function(features, chartContainer, selectedColoring) {
        var data = this.getCumulativeEventsVDayData(features, selectedColoring);
        var chartOpts = this.getBasicChartJSON();
        var formatterCallback = this.pointFormatterCallback;
        var title = "Cumulative Number of Events";
        var seriesType = "scatter";
        if ($("#switch-to-distribution-button").attr("data-original-title") === "Switch to cumulative") {
            title = "Distribution";
            formatterCallback = null;
            seriesType = "column";
        }

        var curChart = $("#" + chartContainer).highcharts();
        if (curChart) {
            curChart.series[0].update({ type: seriesType }, false);
            curChart.tooltip.options.formatter = formatterCallback;
            curChart.yAxis[0].setTitle({ text: title }, null, false);
            curChart.series[0].setData(data, true, false, false);
        } else {
            chartOpts.xAxis.type = "datetime";
            chartOpts.xAxis.dateTimeLabelFormats = { month: '%b %Y', year: '%Y' };
            chartOpts.yAxis.title = { text: title };
            chartOpts.tooltip = {
                xDateFormat: "%Y-%b-%d",
                formatter: formatterCallback
            };
            // save it before we push the data to series
            this.highChartsOpts[chartContainer] = chartOpts;

            chartOpts.series.push({
                type: seriesType,
                name: 'Cumulative',
                data: data,
                marker: {
                    enabled: true
                },
                showInLegend: false,
            });

            this.createChartDestroyingOld(chartContainer, chartOpts);
        }

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

            // selected coloring has priority, if null, use minimap coloring
            if (selectedColoring) {
                this.miniMapColoring = selectedColoring;
            }

            if (this.miniMapColoring === "depth") {
                selectedColoring = "depth";
                scale = this.depthColorScale;
                scaleColors = this.depthColorScale.jet_r;
            } else if (this.miniMapColoring === "time") {
                selectedColoring = "time";
                scale = this.timeColorScale;
                scaleColors = this.timeColorScale.jet_r;
            } else {
                throw new Error("Invalid coloring " + this.miniMapColoring + " selected");
            }

            var min = scale.min;
            var max = scale.max;

            var stopsCalculator = new MapboxStopsCalculator();
            var coloringStops = stopsCalculator.getDepthStops(min, max, scaleColors);

            var magCircleSizes = this.map.thirdPartySourcesController.defaultCircleSizes;
            var stopsCalculator = new MapboxStopsCalculator();
            var magStops = stopsCalculator.getMagnitudeStops(1, 10, magCircleSizes);

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
                var html = featureViewOptions.html;
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
            var sanitizedBounds = [bounds._sw, bounds._ne];

            var features = this.map.selector.getAllRenderedSeismicityFeatures(sanitizedBounds);
            if (features.length == 0) {
                return;
            }
            this.setBbox(sanitizedBounds);
            this.createSeismicityCharts(null, null, features);
        }.bind(this);
        this.mapForPlot.on("zoomend", onMoveend);
        this.mapForPlot.on("dragend", onMoveend);
        var styleAndLayer = this.map.getMapBaseStyle("mapbox.streets");
        this.mapForPlot.setStyle(styleAndLayer.style);
    };

    SeismicityGraphsController.prototype.createSeismicityCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        if ($("#seismicity-charts").hasClass("active")) {
            // create mini map first so other charts can set their min and max axes values as appropriate
            this.createChart(selectedColoring, "lat-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "depth-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "lat-vs-depth-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "cumulative-events-vs-date-graph", optionalFeatures, optionalBounds);
        }
    };

    SeismicityGraphsController.prototype.createAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        if ($("#seismicity-charts").hasClass("active")) {
            this.createSeismicityCharts(selectedColoring, optionalBounds, optionalFeatures);
            this.depthColorScale.initVisualScale();
            this.timeColorScale.initVisualScale();
            // we use visibility and not display for the contents because there seems to be a race
            // condition between browser rendering the contents of the div and highcharts
            // creating the plots. This leads to some plots being cut off (I guess highcharts begins)
            // creating before browser has rendered. I'm no expert so this is just a conjecture.
            $(".wrap#seismicity-charts > .content").css("visibility", "visible");
            $("#seismicity-wrap-placeholder-text").css("display", "none");
        }

        if ($("#cross-section-charts").hasClass("active")) {
            this.createCrossSectionCharts(selectedColoring, optionalBounds, optionalFeatures);
        }
    };

    SeismicityGraphsController.prototype.createCrossSectionCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        if ($("#cross-section-charts").hasClass("active")) {
            this.createChart(selectedColoring, "cross-section-depth-vs-long-graph", optionalFeatures, optionalBounds);
            this.createChart(selectedColoring, "cross-section-lat-vs-depth-graph", optionalFeatures, optionalBounds);
        }
    };

    SeismicityGraphsController.prototype.createChart = function(selectedColoring, chartType, optionalFeatures, optionalBounds) {
        var bounds = optionalBounds;
        // no bounds passed in but, this.bbox can still be null
        // here being null is okay, we just do this to give option of using outside bounds or
        // saved class bounds... with features, null isn't okay
        if (!bounds) {
            bounds = this.bbox;
        }

        var features = optionalFeatures;
        if (!features) {
            features = this.map.selector.getAllRenderedSeismicityFeatures(this.bbox);
            if (!features || features.length == 0) {
                return;
            }
        }

        // used save coloring if none supplied
        if (!selectedColoring) {
            selectedColoring = this.seismicityColorings[chartType];
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
        } else if (chartType === "cross-section-depth-vs-long-graph") {
            chartData = this.createDepthVLongGraph(features, "cross-section-depth-vs-long-graph", selectedColoring);
        } else if (chartType === "cross-section-lat-vs-depth-graph") {
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

    SeismicityGraphsController.prototype.showCharts = function() {
        var $chartContainer = $("#seismicity-charts");
        if (!$chartContainer.hasClass("active")) {
            $("#seismicity-charts-maximize-button").click();
        }
    };

    SeismicityGraphsController.prototype.hideCharts = function() {
        var $chartContainer = $("#seismicity-charts");
        if ($chartContainer.hasClass("active")) {
            $("#seismicity-charts-minimize-button").click();
        }
    };

    SeismicityGraphsController.prototype.hideCrossSectionCharts = function() {
        var $sliderContainer = $("#cross-section-charts");
        if ($sliderContainer.hasClass("active")) {
            $("#cross-section-charts-minimize-button").click();
        }
    };

    SeismicityGraphsController.prototype.crossSectionChartsVisible = function() {
        return $("#cross-section-charts").hasClass("active");
    };

    SeismicityGraphsController.prototype.chartsVisible = function() {
        return $("#seismicity-charts").hasClass("active");
    };

    SeismicityGraphsController.prototype.hideChartContainers = function() {
        this.hideCharts();
        this.hideCrossSectionCharts();
    };

    SeismicityGraphsController.prototype.recreateAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        this.destroyAllCharts();
        this.createAllCharts(selectedColoring, optionalBounds, optionalFeatures);
    };
}

function CustomHighchartsSlider() {
    this.chartContainer = null;
    this.manuallySetExtremes = false;
    this.settingData = false;
    this.dontPerformAfterSetExtremes = false;
}

function setupCustomHighchartsSlider() {
    CustomHighchartsSlider.prototype.init = function(height, afterSetExtremes) {
        var chartOpts = this.getBasicChartJSON();
        chartOpts.credits = false;
        chartOpts.chart = {
            margin: [0, 5, 0, 5],
            spacing: [0, 0, 0, 0],
            animation: false // no point in on since charts are hidden
        };

        chartOpts.navigator = {
            enabled: true,
            top: 1,
            xAxis: {
                tickPixelInterval: 75,
                tickPositioner: tickPositionerCallback
            }
        };

        if (height) {
            chartOpts.chart.height = height;
            chartOpts.navigator.height = height;
        }

        chartOpts.xAxis = {
            lineWidth: 0,
            tickLength: 0,
            minRange: 0.01,
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

        this.chartContainer = chartContainer;

        this.createChartDestroyingOld(chartContainer, chartOpts);
        $("#" + chartContainer).css("height", chartOpts.chart.height + "px");
        this.setNavigatorHandlers(chartContainer, ".draggable");
    };

    CustomHighchartsSlider.prototype.setMin = function(min) {
        this.manuallySetExtremes = true;
        this.setNavigatorMin(this.chartContainer, min);
        this.manuallySetExtremes = false;
    };

    CustomHighchartsSlider.prototype.setMax = function(max) {
        this.manuallySetExtremes = true;
        this.setNavigatorMax(this.chartContainer, max);
        this.manuallySetExtremes = false;
    };

    CustomHighchartsSlider.prototype.setMinMax = function(min, max) {
        this.manuallySetExtremes = true;
        this.setNavigatorMinMax(this.chartContainer, min, max);
        this.manuallySetExtremes = false;
    };

    CustomHighchartsSlider.prototype.setNewData = function(newData) {
        var chart = $("#" + this.chartContainer).highcharts();

        if (!chart) {
            return;
        }

        this.settingData = true;
        chart.series[0].setData(newData, true, false, false)
        this.settingData = false;
    };
}

function CustomSliderSeismicityController() {
    this.depthSlider = null;
    this.timeSlider = null;
}

function setupCustomSliderSeismicityController() {
    CustomSliderSeismicityController.prototype.getFeaturesWithinCurrentSliderRanges = function(features, optionalBounds) {
        if (optionalBounds) {
            var polygon = this.map.selector.squareBboxToMapboxPolygon(optionalBounds);
            var searchWithin = {
                "type": "FeatureCollection",
                "features": [polygon]
            };
            var points = {
                "type": "FeatureCollection",
                "features": features
            };

            features = turf.within(points, searchWithin).features;
        }

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
        if (this.depthSlider.settingData) {
            return;
        }
        this.depthRange = { min: e.min, max: e.max };
        this.map.thirdPartySourcesController.filterSeismicities([this.depthRange], "depth");

        this.depthColorScale.setMinMax(e.min, e.max);
        this.crossSectionDepthColorScale.setMinMax(e.min, e.max);
        if (!this.map.seismicityColorScale.inDateMode) {
            this.map.seismicityColorScale.setMinMax(e.min, e.max);
            this.map.thirdPartySourcesController.recolorSeismicities("depth");
        }

        var filteredFeatures = this.getFeaturesWithinCurrentSliderRanges(this.features, this.bbox);
        if (filteredFeatures.length > 0) {
            // call super method to not recreate sliders
            SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, filteredFeatures);
        }
    };

    CustomSliderSeismicityController.prototype.timeSliderCallback = function(e, millisecondValues) {
        this.timeRange = { min: e.min, max: e.max };
        if (this.timeSlider.settingData) {
            return;
        }

        // if insar is up, recolor insar
        if (currentArea) {
            var dates = convertStringsToDateArray(propertyToJSON(currentArea.properties.decimal_dates));
            var startDate = dates[0];
            var endDate = dates[dates.length - 1];
            var seismicityDates = this.timeRange;
            // make sure seismicity dates are within insar dates, capping them at insar extremes otherwise
            var minMilliseconds = startDate.getTime();
            var maxMilliseconds = endDate.getTime();
            if (seismicityDates.max < maxMilliseconds && seismicityDates.max > minMilliseconds) {
                maxMilliseconds = seismicityDates.max;
            }
            if (seismicityDates.min > minMilliseconds && seismicityDates.min < maxMilliseconds) {
                minMilliseconds = seismicityDates.min;
            }
        }
        this.map.thirdPartySourcesController.filterSeismicities([this.timeRange], "time");

        this.timeColorScale.setMinMax(e.min, e.max);
        this.crossSectionTimeColorScale.setMinMax(e.min, e.max);
        if (this.map.seismicityColorScale.inDateMode) {
            this.map.seismicityColorScale.setMinMax(e.min, e.max);
            this.map.thirdPartySourcesController.recolorSeismicities("time");
        }

        var filteredFeatures = this.getFeaturesWithinCurrentSliderRanges(this.features, this.bbox);
        if (filteredFeatures.length > 0) {
            // call super method to not recreate sliders
            SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, filteredFeatures);
        }
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
        var seriesFeatures = [];
        for (var i = 0; i < bins.length; i++) {
            seriesFeatures.push({ x: bins[i], y: amountAtEachBin[i] });
        }

        return this.getSeriesData(seriesFeatures);
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
        var seriesFeatures = [];
        for (var i = 0; i < bins.length; i++) {
            seriesFeatures.push({ x: bins[i], y: amountAtEachBin[i] });
        }

        return this.getSeriesData(seriesFeatures);
    };

    CustomSliderSeismicityController.prototype.createOrUpdateSliders = function(features) {
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

        if (this.depthSlider) {
            this.depthSlider.setNewData(depthData);
        } else {
            this.depthSlider = this.createSlider("depth-slider", depthData, "linear", null, function(e) {
                this.depthSliderCallback(e, depthValues);
            }.bind(this));
        }
        if (this.timeSlider) {
            this.timeSlider.setNewData(millisecondData);
        } else {
            this.timeSlider = this.createSlider("time-slider", millisecondData, "datetime", null, function(e) {
                this.timeSliderCallback(e, millisecondValues);
            }.bind(this));
        }

        this.determineSliderStartingValues(millisecondValues, depthValues);
    };

    CustomSliderSeismicityController.prototype.determineSliderStartingValues = function(millisecondValues, depthValues) {
        var maxDepth = depthValues[depthValues.length - 1];
        var minDepth = depthValues[0];
        var maxMilliseconds = millisecondValues[millisecondValues.length - 1];
        var minMilliseconds = millisecondValues[0];
        this.timeSlider.setMinMax(minMilliseconds, maxMilliseconds);
        this.depthSlider.setMinMax(minDepth, maxDepth);
    };

    CustomSliderSeismicityController.prototype.createAllCharts = function(selectedColoring, optionalBounds, optionalFeatures) {
        SeismicityGraphsController.prototype.createAllCharts.call(this, selectedColoring, optionalBounds, optionalFeatures);
        this.createOrUpdateSliders(optionalFeatures);
    };

    CustomSliderSeismicityController.prototype.destroyAllSliders = function() {
        if (this.slidersVisible()) {
            $("#depth-slider").highcharts().destroy();
            $("#time-slider").highcharts().destroy();
        }

        this.timeSlider = null;
        this.depthSlider = null;
    };

    // override
    CustomSliderSeismicityController.prototype.destroyAllCharts = function() {
        SeismicityGraphsController.prototype.destroyAllCharts.call(this);
        this.destroyAllSliders();
    };

    CustomSliderSeismicityController.prototype.slidersVisible = function() {
        return $("#seismicity-chart-sliders").hasClass("active");
    };

    CustomSliderSeismicityController.prototype.showSliders = function() {
        var $topMostDiv = $("#charts");
        if (!$topMostDiv.hasClass("active")) {
            $topMostDiv.addClass("active");
        }
        $topMostDiv.addClass("show-seismicity-sliders");

        var $sliderContainer = $("#seismicity-chart-sliders");
        if ($sliderContainer.hasClass("no-display")) {
            $sliderContainer.removeClass("no-display");
        }

        $("#hide-when-only-show-sliders").css("display", "none");
    };

    CustomSliderSeismicityController.prototype.hidesliders = function() {
        var $sliderContainer = $("#seismicity-chart-sliders");
        if (!$sliderContainer.hasClass("no-display")) {
            $sliderContainer.addClass("no-display");
        }

        var $topMostDiv = $("#charts");
        if ($topMostDiv.hasClass("show-seismicity-sliders")) {
            $topMostDiv.removeClass("show-seismicity-sliders");
        }
    };

    CustomSliderSeismicityController.prototype.showChartContainers = function() {
        this.showSliders();
        this.showCharts();
    };

    // overrride
    CustomSliderSeismicityController.prototype.hideChartContainers = function() {
        SeismicityGraphsController.prototype.hideChartContainers.call(this);
        this.hidesliders();
    };

    // an alternative would be to keep slider pointers with their associated data and just
    // use highcharts constructor to update sliders. we create anew because this highcharts
    // constructor used to have bugs (see: https://forum.highcharts.com/post126503.html#p126503),
    // and although they've now fixed it, we want to remain consistent with our other graph code.
    // In the future, someone can use the constructor functions to update graphs rather than creating anew every time.
    CustomSliderSeismicityController.prototype.zoomSliderToCurrentRange = function(sliderName) {
        var features = this.map.selector.getAllRenderedSeismicityFeatures(this.bbox);
        if (features.length == 0) {
            return;
        }

        features = features.sort(function(feature1, feature2) {
            return feature1.properties.time - feature2.properties.time;
        });

        var depthData = this.getDepthHistogram(features);
        var millisecondData = this.getEventsHistogram(features);

        var depthValues = [];
        var millisecondValues = [];

        features.forEach(function(feature) {
            depthValues.push(feature.properties.depth);
            millisecondValues.push(feature.properties.time);
        });

        if (sliderName === "depth-slider") {
            // need to sort depth values as highcharts requires charts with navigator to have sorted data (else get error 15).
            // also, callbacks depend on sorted arrays (for speed). no need to sort milliseconds as the features are already sorted by this
            depthValues.sort(function(depth1, depth2) {
                return depth1 - depth2;
            });

            var maxDepth = depthValues[depthValues.length - 1];
            var minDepth = depthValues[0];
            this.depthSlider.setNewData(depthData);
            this.depthSlider.setMinMax(minDepth, maxDepth);
        } else if (sliderName === "time-slider") {
            var maxMilliseconds = millisecondValues[millisecondValues.length - 1];
            var minMilliseconds = millisecondValues[0];
            this.timeSlider.setNewData(millisecondData);
            this.timeSlider.setMinMax(minMilliseconds, maxMilliseconds);
        }

        // call super method to not recreate sliders
        SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, features);
    };

    // TODO: this method, and the above, look like they can seriously be rafctored
    CustomSliderSeismicityController.prototype.resetSliderRange = function(sliderName) {
        var features = this.features;
        var depthData = this.getDepthHistogram(features);
        var millisecondData = this.getEventsHistogram(features);

        var depthValues = [];
        var millisecondValues = [];

        features.forEach(function(feature) {
            depthValues.push(feature.properties.depth);
            millisecondValues.push(feature.properties.time);
        });

        if (sliderName === "depth-slider") {
            // need to sort depth values as highcharts requires charts with navigator to have sorted data (else get error 15).
            // also, callbacks depend on sorted arrays (for speed). no need to sort milliseconds as the features are already sorted by this
            depthValues.sort(function(depth1, depth2) {
                return depth1 - depth2;
            });
            var maxDepth = depthValues[depthValues.length - 1];
            var minDepth = depthValues[0];

            this.depthSlider.setNewData(depthData);
            this.depthSlider.setMinMax(minDepth, maxDepth);
        } else if (sliderName === "time-slider") {
            var maxMilliseconds = millisecondValues[millisecondValues.length - 1];
            var minMilliseconds = millisecondValues[0];

            this.timeSlider.setNewData(millisecondData);
            this.timeSlider.setMinMax(minMilliseconds, maxMilliseconds);
        }

        this.map.thirdPartySourcesController.recolorSeismicities(this.map.thirdPartySourcesController.currentSeismicityColoring);

        // can't just remove all filters from main map features as sliders are independent of each other now
        var filteredFeatures = this.getFeaturesWithinCurrentSliderRanges(this.features, this.bbox);
        // call super method to not recreate sliders
        if (filteredFeatures.length > 0) {
            SeismicityGraphsController.prototype.createAllCharts.call(this, null, null, filteredFeatures);
        }
    };
}

