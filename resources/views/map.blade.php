<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Insar Viewer - University of Miami</title>
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
    <!--boostrap-->
    <!-- Latest compiled and minified CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.28.3/css/theme.bootstrap.min.css" rel="stylesheet">
    <!-- Latest compiled and minified JavaScript -->
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="/css/mainPage.css" />
    <link rel="stylesheet" href="/css/mobile-mainPage.css" />
    <link rel="stylesheet" href="/css/autocomplete.css" />
</head>

<body>
    <div id="information-div" class="overlay-div">
        <div class="vertically-aligned" id="information-div-contents">
            <p>
                This website provides InSAR displacement time-series produced by the University of Miami Geodesy Laboratory, which is supported by NASA and the NSF. For InSAR stack processing, we use the stack processor (Fattahi et al., 2016) within ISCE software (Rosen et al., 2012) from JPL/Caltech for Sentinel-1 and for most other sensors a combination of ROI_PAC (Rosen et al., 2004) and the GAMMA software (Werner et al., 2000). For time series analysis, we use the MintPy software (Yunjun et al., 2019) developed at University of Miami.</p>
            <p>
                Yunjun, Z., H. Fattahi, F. Amelung (2019), Small baseline InSAR time series analysis: Unwrapping error correction and noise reduction, Computers &amp; Geosciences, 133, 104331, doi:10.1016/j.cageo.2019.104331.
            </p>
            <p>
                This website was created by University of Miami Computer Science students Alfredo Terrero and Zishi Wu. It started as a class project of CSC 431, taught by Chris Mader and Julio Perez of the University of Miami’s Center for Computational Sciences (CCS). The data processing is conducted using the University of Miami’s High Performance Computing systems.
            </p>
            @if (Auth::guest())
            <p>
                To access data sets which are not yet finalized, please login here:
            </p>
            <a href="/auth/login" class="btn btn-primary-outline">Login</a>
            @endif
            <p>
                For accessing the data products via web services, click here:
            </p>
            <a href="/WebServicesUI" class="btn btn-primary-outline">Web Services</a>
            <span id="current-point-webservices-link"></span>
            <p>To see examples of how to embed maps into your own site, see: (Examples from Ecuador and Hawaii):</p>
            <a href="/examples" class="btn btn-primary-outline">Examples</a>
            <p>
                This website relies on Mapbox GL JS, which in turn relies on WebGL. As it stands, Google Chrome offers the best compatibility when browsing this site.
            </p>
            <img src="/img/nasa.png" alt="nasa_logo" height="100px" width="auto">
            <img src="/img/nsf1.gif" alt="nsf_logo" height="100px" width="auto" class="logo2">
            <div id="information-div-buttom-buttons">
                <div id="close-information-button">
                    <button class="btn btn-primary-outline">Close</button>
                </div>
            </div>
        </div>
    </div>
    <div id="loading-screen" class="overlay-div">
        <div id="loading-screen-contents">
            <div class="loading-text-div" id="loading-text-div-top">
                Recoloring in progress...
            </div>
            <div id="loading-circle-container">
                <div class="loading-circle"></div>
            </div>
            <div class="loading-text-div" id="loading-text-div-bottom">ESCAPE or click/tap this box to interrupt</div>
        </div>
    </div>
    <div id="map-container">
        <div id="top-map-buttons">
            <div id="search-form">
                <!--search bar-->
                <div id="search-bar">
                    <div class="form-group custom-input-container">
                        <!-- <span class="input-group-btn">
                <button class="btn btn-default" id="search-button" type="button">Search</button>
                </span> -->
                        <input type="text" placeholder="Search for..." id="search-input" />
                        <div class="custom-input-dropdown" id="toggle-other-bars">
                            <div class="caret"></div>
                        </div>
                    </div>
                </div>
                <div id="hidden-search-bars-container">
                    <div class="form-group custom-input-container">
                        <input type="text" placeholder="Satellite" id="input-satellite" list="satellites-list" />
                        <div class="custom-input-dropdown hide-dropdown">
                            <div class="caret"></div>
                        </div>
                    </div>
                    <div class="form-group custom-input-container">
                        <input type="text" placeholder="Relative Orbit" id="input-relative-orbit" />
                    </div>
                    <div class="form-group custom-input-container">
                        <input type="text" placeholder="First Frame" id="input-first-frame" />
                    </div>
                    <div class="form-group custom-input-container">
                        <input type="text" placeholder="Mode" id="input-mode" list="modes-list" />
                        <div class="custom-input-dropdown hide-dropdown">
                            <div class="caret"></div>
                        </div>
                        <!-- <datalist id="modes-list"></datalist> -->
                    </div>
                    <div class="form-group custom-input-container">
                        <input type="text" placeholder="Flight Direction" id="input-flight-direction" list="flight-direction-list" />
                        <div class="custom-input-dropdown hide-dropdown">
                            <div class="caret"></div>
                        </div>
                    </div>
                    <button class="form-group custom-input-container" id="recent-datasets-toggle-button" data-toggle="tooltip" title="Show last year data">All items</button>
                    <!-- enter button to search for files with attributes matching above input -->
                    <!-- <div id="enter-button-search-attributes">
              <button class="btn btn-primary btn-block">Enter</button>
              </div> -->
                </div>
            </div>
            <div id="overlay-options-wrapper">
                <div id="overlay-options">
                    <label>Opacity:</label>
                    <div id="overlay-slider"></div>
                </div>
            </div>
            <div>
                <button class="btn btn-primary-outline map-button no-padding" data-toggle="tooltip" data-placement="right" title="Add contour lines" id="contour-toggle-button">
                    <img src="/img/contourIcon.png" alt="contourIcon.png" style="width: 20px; height: 20px">
                </button>
            </div>
            <a class="btn btn-primary-outline" id="reset-button" role="button" href="/">Reset</a>
            <button class="btn btn-primary-outline" id="information-button">About</button>
            @if (Auth::check())
            <a href="/auth/logout" class="btn btn-primary-outline">Logout</a>
                @if (Auth::user()->isAdmin)
                <a href="/adminPanel" class="btn btn-primary-outline">Admin Panel</a>
                @endif
            @endif
            <!-- we inline hide it as we arent sure yet if want this button or not... -->
            <div id="square-selector-button-div">
                <button class="btn btn-primary-outline map-button no-padding clickable-button" data-toggle="tooltip" data-placement="right" title="Select rectangle" id="square-selector-button">
                    <img src="/img/polygon.svg" alt="polygon.svg">
                </button>
            </div>
            <div>
                <button class="btn btn-primary-outline map-button no-padding" data-toggle="tooltip" data-placement="right" title="Hide swaths" id="dataset-frames-toggle-button">
                    <img src="/img/swathIcon.png" alt="swathIcon.png" style="width: 20px; height: 20px">
                </button>
            </div>
            <div id="select-layer-button-div">
                <button class="btn btn-primary-outline map-button" data-toggle="tooltip" data-placement="right" title="More options" id="select-layer-button">
                    <img src="/img/layerSwitchIcon.png" alt="layerSwitchIcon.png" style="width: 20px; height: 20px">
                </button>
                <div id="overlay-options-container">
                    <div id="map-type-menu">
                        <input id='streets' type='radio' name='rtoggle' value='streets' checked="checked" />
                        <label for='streets'>Streets</label>
                        <input id='satellite' type='radio' name='rtoggle' value='satellite' />
                        <label for='satellite'>Satellite</label>
                        @if (Auth::check() && Auth::user()->isAdmin)
                        <!-- remove when functionality made available to third parties -->
                        <input id='google-satellite' type='radio' name='rtoggle' value='google-satellite' />
                        <label for='google-satellite'>Google Satellite</label>
                        @endif
                    </div>
                    <button class="btn btn-primary-outline" id="hide-show-seismicities-button" data-toggle="tooltip" title="Show">Seismicity</button>
                    <button class="btn btn-primary-outline" id="hide-show-insar-button" data-toggle="tooltip" title="Show">InSAR</button>
                    <div id="overlay-options-toggles"></div>
                    <label for="japan-seismicity-select">Japan Seismicity</label>
                    <select id="japan-seismicity-select">
                        <option selected disabled hidden style='display: none' value=''></option>
                        <option value="2005-2006">2005-2006</option>
                        <option value="2007-2008">2007-2008</option>
                        <option value="2009-2010">2009-2010</option>
                        <option value="2011-2012">2011-2012</option>
                        <option value="2013-2014">2013-2014</option>
                        <option value="2015">2015</option>
                        <option value="remove">Remove</option>
                    </select>
                    <br>
                    <div>
                        <button class="btn btn-primary-outline" data-placement="right" title="Select reference point" id="select-reference-point-toggle-button">
                            Select Reference Point
                        </button>
                        <button class="btn btn-primary-outline" data-placement="right" title="Reset reference point" id="reset-reference-point-toggle-button">
                            Reset Reference Point
                        </button>
                    </div>
                    <button class="btn btn-primary-outline" id="toggle-insar-circle-size-button" data-toggle="tooltip" title="Resize insar points to their actual size. Resets on zoom change">Actual Size</button>
                    <div class="wrap wrap-transitions draggable" id="USGSEvents-options-wrapper">
                        <div id="USGSEvents-options">
                            <div class="top-right-buttons">
                                <button type="button" class="minimize-button" data-dismiss="modal" id="USGSEvents-options-minimize-button"></button>
                            </div>
                            <div class="content">
                                <div id="usgs-events-current-viewport"></div>
                                <label>Start Date</label>
                                <input type="text" class="form-control start-date" />
                                <label>End Date</label>
                                <input type="text" class="form-control end-date" />
                                <label>Min Magnitude</label>
                                <input type="number" class="form-control min-magnitude" value="4" />
                                <label>Max Magnitude</label>
                                <input type="number" class="form-control max-magnitude" value="10" />
                                <label>Min Depth</label>
                                <input type="number" class="form-control min-depth" value="0" />
                                <label>Max Depth</label>
                                <input type="number" class="form-control max-depth" value="30" />
                                <button class="btn btn-info" id="USGSEvents-options-submit-button">Submit</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- by default, it is toggled, or minimized -->
        <div id="search-form-and-results-container" class="maximized">
            <table class="table table-fixed" id="search-form-results-table">
                <thead>
                    <tr>
                        <th class="col-xs-2">Satellite</th>
                        <th class="col-xs-2 col-half-offset">Rel Orbit</th>
                        <th class="col-xs-2 col-half-offset">First Frame</th>
                        <th class="col-xs-2 col-half-offset">Mode</th>
                        <th class="col-xs-2 col-half-offset">
                            <div class="float-left">Flight Dir.</div>
                            <div class="float-right top-right-buttons">
                                <button type="button" class="minimize-button" data-dismiss="modal" aria-label="Close" id="frame-window-div-minimize-button"></button>
                                <button type="button" class="maximize-button hidden" data-dismiss="modal" aria-label="Close" id="frame-window-div-maximize-button"></button>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        <div id="magnitude-and-arrow-scale-container">
            <div class="custom-scale" id="magnitude-scale" data-toggle="tooltip" title="Shrink relative scale">
                <h5>Mag</h5>
                <div id="magnitude-scale-circles"></div>
                <div id="magnitude-scale-values"></div>
            </div>
            <div class="custom-scale" id="arrow-length-scale">
                <h5 id="arrow-length-value"></h5>
                <img id="arrow-image" src="/img/arrow.PNG">
            </div>
        </div>
        <div id="insar-seismicity-color-scales-container">
            <div class="color-scale" id="color-scale">
                <div class="btn btn-primary color-scale-text-div" class="rotate" data-toggle="tooltip" title="Color on time">
                    LOS Velocity<br>[cm/yr]
                </div>
                <div class="color-scale-main-container">
                    <div class="color-scale-and-values-container" class="clearfix">
                        <div class="color-scale-picture-div">
                            <div class="hidden-colorscale-click-area scale-click-area-invisible-top-half" data-scale-type="insar"data-toggle="tooltip" title="Double scale"></div>
                            <img src="/img/jet_scale.PNG" alt="jet_scale.PNG">
                            <div class="hidden-colorscale-click-area scale-click-area-invisible-bottom-half"" data-scale-type="insar" data-toggle="tooltip" title="Halve scale"></div>
                        </div>
                        <div class="scale-values">
                            <div class="left-scale-minimum">
                                <div class="form-group">
                                    <input type="number" class="form-control bottom-scale-value" value={{ $urlOptions['startingDatasetOptions']['minScale'] or '-2.0'  }} />
                                </div>
                            </div>
                            <div class="right-scale-maximum">
                                <div class="form-group">
                                    <input type="number" class="form-control top-scale-value" value={{ $urlOptions['startingDatasetOptions']['maxScale'] or '2.0'  }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="color-scale" id="seismicity-color-scale">
                <div class="btn btn-primary color-scale-text-div" class="rotate" data-toggle="tooltip" title="Color on time">
                    Depth-colored<br>[Km]
                </div>
                <div class="color-scale-main-container">
                    <div class="color-scale-and-values-container" class="clearfix">
                        <div class="color-scale-picture-div">
                            <img src="/img/jet_scale.PNG" alt="jet_scale.PNG">
                        </div>
                        <div class="scale-values">
                            <div class="left-scale-minimum">
                                <div class="form-group">
                                    <input type="number" class="form-control bottom-scale-value" value="2.0" />
                                </div>
                            </div>
                            <div class="right-scale-maximum">
                                <div class="form-group">
                                    <input type="number" class="form-control top-scale-value" value="2.0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="point-details">
            <div class="row">
                <div class="col-sm-6" id="mouse-move-lat-lng">
                </div>
                <div class="col-sm-6" id="clicked-point-lat-lng">
                </div>
            </div>
        </div>
        <div class="maximize-buttons-container hidden">
            <div class="btn btn-primary" id="seismicity-maximize-buttons-container">
                <div class="maximize-button-container">
                    <button type="button" class="maximize-button" data-dismiss="modal" id="seismicity-chart-sliders-maximize-button" data-toggle="tooltip" title="Seismicity plot sliders"></button>
                </div>
                <div class="maximize-button-container">
                    <button type="button" class="maximize-button" data-dismiss="modal" id="cross-section-charts-maximize-button" data-toggle="tooltip" title="Cross section"></button>
                </div>
                <div class="maximize-button-container">
                    <button type="button" class="maximize-button" data-dismiss="modal" id="seismicity-charts-maximize-button" data-toggle="tooltip" title="Map view"></button>
                </div>
            </div>
            <div class="btn btn-primary active" id="insar-maximize-buttons-container">
                <div class="maximize-button-container">
                    <button type="button" class="maximize-button" data-dismiss="modal" aria-label="Close" data-toggle="tooltip" title="Attributes" id="area-attributes-div-maximize-button"></button>
                </div>
            </div>
        </div>
        <div class="wrap wrap-transitions draggable minimized" id="charts">
            <div class="top-right-buttons">
                <button type="button" class="minimize-button" data-dismiss="modal" aria-label="Close" id="graph-div-minimize-button"></button>
                <button type="button" class="maximize-button dont-hide-on-click" data-dismiss="modal" aria-label="Close" id="graph-div-maximize-button"></button>
            </div>
            <div class="content">
                <div id="hide-when-only-show-sliders">
                    <div class="chart-containers clearfix" id="chart-containers">
                        <div id="chartContainer" class="side-item">
                        </div>
                        <div id="chartContainer2" class="side-item"></div>
                    </div>
                    <div class="clearfix" id="graph-select-div">
                        <div class="overlay_toggle">
                            <div id="top-graph-focus-div">
                                Select
                                <input id="top-graph-toggle-button" type="checkbox" name="overlayToggle" />
                            </div>
                        </div>
                        <div class="overlay_toggle">
                            <div id="bottom-graph-focus-div">
                                Select
                                <input id="bottom-graph-toggle-button" type="checkbox" name="overlayToggle" />
                            </div>
                        </div>
                    </div>
                    <div class="clearfix" id="map-options">
                        <div class="overlay_toggle">
                            <label>Second graph</label>
                            <input id="second-graph-toggle-button" type="checkbox" name="overlayToggle" />
                        </div>
                        <div class="overlay_toggle">
                            <label>Line</label>
                            <input id="dot-toggle-button" type="checkbox" name="overlayToggle" />
                        </div>
                        <div class="overlay_toggle">
                            <label>Regression</label>
                            <input id="regression-toggle-button" type="checkbox" name="overlayToggle" />
                        </div>
                        <div class="overlay_toggle">
                            <label>Detrend</label>
                            <input id="detrend-toggle-button" type="checkbox" name="overlayToggle" />
                        </div>
                        <!-- POTENTIALLY REMOVE -->
                        <!-- <div class="overlay_toggle">
                            <label>Sync</label>
                            <input id="insar-sync-toggle-button" type="checkbox" name="overlayToggle" />
                        </div> -->
                        <button class="btn-xs btn-primary-outline" id="download-as-text-button">Download as TXT</button>
                    </div>
                </div>
                <div class="chart-slider" id="insar-chart-slider"></div>
                <div class="no-display" id="seismicity-chart-sliders">
                    <div class="chart-containers">
                        <h7>Time (Distribution)</h7>
                        <div class="chart-slider" id="time-slider"></div>
                        <button class="btn btn-primary-outline slider-range-button" data-slider-type="time-slider">Set Range</button>
                        <button class="btn btn-primary-outline slider-reset-button" data-slider-type="time-slider">Reset</button>
                        <!-- POTENTIALLY REMOVE -->
                        <!-- <button class="btn btn-primary-outline" id="set-insar-time-range-to-seismicity-button">Sync</button>
                        <label>Sync</label>
                        <input id="seismicity-sync-toggle-button" type="checkbox" name="overlayToggle"> -->
                        <br>
                        <h7>Depth (Distribution)</h7>
                        <div class="chart-slider" id="depth-slider"></div>
                        <button class="btn btn-primary-outline slider-range-button" data-slider-type="depth-slider">Set Range</button>
                        <button class="btn btn-primary-outline slider-reset-button" data-slider-type="depth-slider">Reset</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="wrap wrap-transitions draggable" id="seismicity-charts">
            <div class="top-right-buttons">
                <button type="button" class="minimize-button" data-dismiss="modal" id="seismicity-charts-minimize-button"></button>
            </div>
            <h3 id="seismicity-wrap-placeholder-text" style="display: none;">Select bounding box using select tool</h3>
            <div class="content">
                <div class="chart-containers seismicity-charts-container">
                    <div class="seismicity-chart">
                        <div class="side-by-side">
                            <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="lat-vs-long-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                            <div class="chart" id="lat-vs-long-graph"></div>
                        </div>
                        <div class="side-by-side">
                            <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="lat-vs-depth-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                            <div class="chart" id="lat-vs-depth-graph"></div>
                        </div>
                    </div>
                    <div class="seismicity-chart">
                        <div class="side-by-side">
                            <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="depth-vs-long-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                            <div class="chart" id="depth-vs-long-graph"></div>
                        </div>
                        <div class="side-by-side">
                            <div class="minimap-color-scale" id="lat-vs-long-depth-color-scale">
                                <div class="color-scale-text-div" class="rotate">
                                    Depth (Km)
                                </div>
                                <div class="color-scale-main-container">
                                    <div class="color-scale-and-values-container clearfix">
                                        <div class="scale-values">
                                            <div class="left-scale-minimum">
                                                <div class="form-group">
                                                    <input type="number" class="form-control bottom-scale-value" value="2.0" />
                                                </div>
                                            </div>
                                            <div class="right-scale-maximum">
                                                <div class="form-group">
                                                    <input type="number" class="form-control top-scale-value" value="2.0" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="minimap-color-scale" id="lat-vs-long-time-color-scale">
                                <div class="color-scale-text-div" class="rotate">
                                    Time
                                </div>
                                <div class="color-scale-main-container">
                                    <div class="color-scale-and-values-container clearfix">
                                        <div class="color-scale-picture-div">
                                            <img src="/img/jet_scale.PNG" alt="jet_scale.PNG">
                                        </div>
                                        <div class="scale-values">
                                            <div class="left-scale-minimum">
                                                <div class="form-group">
                                                    <input type="number" class="form-control bottom-scale-value" value="2.0" />
                                                </div>
                                            </div>
                                            <div class="right-scale-maximum">
                                                <div class="form-group">
                                                    <input type="number" class="form-control top-scale-value" value="2.0" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="seismicity-chart" id="cumulative-events-vs-date-container">
                        <div class="chart" id="cumulative-events-vs-date-graph"></div>
                        <div id="cumulative-events-vs-date-chart-buttons-container">
                            <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="cumulative-events-vs-date-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                            <button class="btn btn-primary-outline" id="switch-to-distribution-button" data-toggle="tooltip" title="Switch to distribution" name="overlayToggle" data-placement="bottom">Cumulative</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="wrap wrap-transitions draggable" id="cross-section-charts">
            <div class="top-right-buttons">
                <button type="button" class="minimize-button" data-dismiss="modal" id="cross-section-charts-minimize-button"></button>
            </div>
            <div class="content">
                <div class="chart-containers seismicity-charts-container">
                    <div class="cross-section-chart">
                        <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="cross-section-lat-vs-depth-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                        <div class="chart" id="cross-section-lat-vs-depth-graph"></div>
                    </div>
                    <div class="cross-section-chart">
                        <button class="seismicity-chart-set-coloring-button btn btn-primary-outline" data-chart-type="cross-section-depth-vs-long-graph" data-toggle="tooltip" title="Color on time" data-placement="bottom">Depth-colored<br>[Km]</button>
                        <div class="chart" id="cross-section-depth-vs-long-graph"></div>
                    </div>
                    <div class="cross-section-chart">
                        <div class="minimap-color-scale" id="cross-section-depth-color-scale">
                            <div class="color-scale-text-div" class="rotate">
                                Depth (Km)
                            </div>
                            <div class="color-scale-main-container">
                                <div class="color-scale-and-values-container clearfix">
                                    <div class="scale-values">
                                        <div class="left-scale-minimum">
                                            <div class="form-group">
                                                <input type="number" class="form-control bottom-scale-value" value="2.0" />
                                            </div>
                                        </div>
                                        <div class="right-scale-maximum">
                                            <div class="form-group">
                                                <input type="number" class="form-control top-scale-value" value="2.0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="minimap-color-scale" id="cross-section-time-color-scale">
                            <div class="color-scale-text-div" class="rotate">
                                Time
                            </div>
                            <div class="color-scale-main-container">
                                <div class="color-scale-and-values-container clearfix">
                                    <div class="color-scale-picture-div">
                                        <img src="/img/jet_scale.PNG" alt="jet_scale.PNG">
                                    </div>
                                    <div class="scale-values">
                                        <div class="left-scale-minimum">
                                            <div class="form-group">
                                                <input type="number" class="form-control bottom-scale-value" value="2.0" />
                                            </div>
                                        </div>
                                        <div class="right-scale-maximum">
                                            <div class="form-group">
                                                <input type="number" class="form-control top-scale-value" value="2.0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="wrap wrap-transitions minimized" id="area-attributes-div" title="Attributes">
            <div class="top-right-buttons">
                <button type="button" class="minimize-button" data-dismiss="modal" aria-label="Close" id="area-attributes-div-minimize-button"></button>
            </div>
            <div class="content">
                <ul class="tab">
                    <div id="area-attributes-areaname-div"></div>
                    <li><a href="#" id="details-tab-link" class="tablinks" onclick="goToTab(event, 'details-tab')">Details</a></li>
                    <li><a href="#" class="tablinks" onclick="goToTab(event, 'downloads-tab')">Downloads</a></li>
                    <li><a href="#" class="tablinks" onclick="goToTab(event, 'processing-report-tab')">Processing Report</a></li>
                    <!-- <li><a href="#" class="tablinks" onclick="goToTab(event, 'links-tab')">Links</a></li> -->
                </ul>
                <div id="details-tab" class="tabcontent">
                    <table class="table" id="area-attributes-table">
                        <thead>
                        </thead>
                        <tbody id="area-attributes-table-body">
                        </tbody>
                    </table>
                </div>
                <div id="downloads-tab" class="tabcontent">
                    <p>Download to Unavco InSAR data products to be implemented.</p>
                </div>
                <div id="processing-report-tab" class="tabcontent">
                    <p>Processing report to be added.</p>
                </div>
                <!-- <div id="links-tab" class="tabcontent">
          <p>Extra links to be added.</p>
          </div> -->
            </div>
        </div>
        <div class="wrap wrap-transitions" id="topography-wrap" title="Topography-Wrap">
            <div class="top-right-buttons">
                <button type="button" class="close close-button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            </div>
            <div class="content"></div>
        </div>
        <div id="subset-swath-popup">
            <table class="table" id="subset-swath-table">
                <thead>
                    <tr>
                        <th>
                            Start Date
                        </th>
                        <th>
                            End Date
                        </th>
                        <th>
                            Unavco Name
                        </th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
    </div>
    <script type="text/javascript">
    var urlOptions = {!! json_encode($urlOptions) !!};
    const MBTILES_SERVER = "{!! env("MBTILES_SERVER") !!}";
    </script>
    <link rel="stylesheet" href="/css/slideout.css" />
    <script src='https://api.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.css' rel='stylesheet' />
    <script src='https://npmcdn.com/@turf/turf/turf.min.js'></script>
    <script src="https://unpkg.com/terraformer@1.0.8"></script>
    <script src="https://unpkg.com/terraformer-wkt-parser@1.1.2"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.css" rel="stylesheet">
    <script type="text/javascript">
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
    </script>
    <script type="text/javascript" src="/js/regression.js"></script>
    <script type="text/javascript" src="/js/canvasjs.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.28.3/js/jquery.tablesorter.min.js"></script>
    <script src="https://code.highcharts.com/stock/highstock.js"></script>
    <script src="https://code.highcharts.com/stock/modules/exporting.js"></script>
    <script src="//rawgithub.com/phpepe/highcharts-regression/master/highcharts-regression.js">
    </script>
    <script src="https://code.highcharts.com/modules/exporting.js"></script>
    <script src="https://code.highcharts.com/modules/export-data.js"></script>
    <script src="https://code.highcharts.com/modules/accessibility.js"></script>
    <script type="text/javascript" src="/js/fuse.js"></script>
    <script type="text/javascript" src="/js/helperFunctions.js"></script>
    <script type="text/javascript" src="/js/GraphsController.js"></script>
    <script type="text/javascript" src="/js/CancellableAjax.js"></script>
    <script type="text/javascript" src="/js/gpsStations.js"></script>
    <script type="text/javascript" src="/js/ColorScale.js"></script>
    <script type="text/javascript" src="/js/AreaMarkerLayer.js"></script>
    <script type="text/javascript" src="/js/AreaAttributesController.js"></script>
    <script type="text/javascript" src="/js/mainPage.js"></script>
    <script type="text/javascript" src="/js/Search.js"></script>
    <script type="text/javascript" src="/js/Swath.js"></script>
    <script type="text/javascript" src="/js/Vector.js"></script>
    <script type="text/javascript" src="/js/USGSEventsOptionsController.js"></script>
    <script type="text/javascript" src="/js/ThirdPartySourcesController.js"></script>
    <script type="text/javascript" src="/js/mainMap.js"></script>
    <script type="text/javascript" src="/js/SquareSelector.js"></script>
    <script type="text/javascript" src="/js/LineSelector.js"></script>
    <script type="text/javascript" src="/js/FeatureSelector.js"></script>
    <script type="text/javascript" src="/js/AreaFilterSelector.js"></script>
    <script type="text/javascript" src="/js/GoogleElevationChunkedQuerier.js"></script>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBm77jFIq1iM3mpL5CgB1uvW6jGcefbIYs" async defer></script>
</body>

</html>
