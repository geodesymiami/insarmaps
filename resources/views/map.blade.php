<!DOCTYPE html>
<html>
<head>
 <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.css" />
 <link rel="stylesheet" href="css/mainPage.css" />
 <!--jQuery-->
 <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
 <!--leaflet-->
 <script src="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.js"></script>
 <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v0.20.0/mapbox-gl.js'></script>
 <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v0.20.0/mapbox-gl.css' rel='stylesheet' />
 
 <script src="https://code.jquery.com/jquery-1.12.2.js"></script>
 <script src="http://code.jquery.com/ui/1.11.4/jquery-ui.js"></script>
 <link href="http://code.jquery.com/ui/1.11.4/themes/ui-lightness/jquery-ui.css" rel="stylesheet">
 
 <link href="vendor/mapbox-gl-draw.css" rel="stylesheet" />    <script type="text/javascript" src="vendor/mapbox-gl-draw.js"></script>
 <script type="text/javascript" src="js/regression.js"></script>
 <script type="text/javascript" src="js/canvasjs.min.js"></script>
 
 <script src="http://code.highcharts.com/stock/highstock.js"></script>
 <script src="http://code.highcharts.com/stock/modules/exporting.js"></script>
 <meta name="csrf-token" content="{{ csrf_token() }}" />
 <script type="text/javascript">
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
</script>

 <script src="//rawgithub.com/phpepe/highcharts-regression/master/highcharts-regression.js"> </script>
 <!--boostrap-->
 <!-- Latest compiled and minified CSS -->
 <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">
 <!-- Latest compiled and minified JavaScript -->
 <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>
 <script type="text/javascript" src="js/fuse.js"></script>
 <script src='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v1.0.0/mapbox-gl-geocoder.js'></script>
 <link href='https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v1.0.0/mapbox-gl-geocoder.css' rel='stylesheet' />
 <link href="css/mapbox-gl-draw.css" rel="stylesheet" />
 <script type="text/javascript" src="js/mapbox-gl-draw.js"></script>
</head>
<body>
  <div id="map-container">
    <div id="map-type-menu">
      <input id='streets' type='radio' name='rtoggle' value='streets' checked="checked">
      <label for='streets'>streets</label>
      <input id='satellite' type='radio' name='rtoggle' value='satellite'>
      <label for='satellite'>satellite</label>
    </div>
    <div id="polygon-button-div">
      <button class="btn btn-primary-outline" data-toggle="tooltip" data-placement="right" title="Draw polygon" id="polygon-button">P</button>
    </div>
    <div id="reset-button">
      <button class="btn btn-primary-outline">Reset</button>
    </div>
  </div>
  <div class="side-bar">
    <div class="side-item-box">
      <!--div class="side-item move-button"></div-->
      <div class="side-item title">
        <h3>University of Miami’s inSAR Time Series Viewer</h3>
      </div>
      <div class="overlay_toggle">
        <label>Turn on/off data overlay</label>
        <div id="overlay-toggle-button" class="toggle-button">
          <button></button>
        </div>
      </div>
      <div id="overlay-slider"></div>
      <!--<div class="side-item description">
        <p>Description of inSAR map web application.</p>
      </div>-->


      <div class="menu">
        <button class="accordion">What is the InSar Project?</button>
        <div class="panel">
          <p>The University of Miami Geodesy laboratory studies volcanic, cryospheric and tectonic problems using Interferometric Synthetic Aperture Radar (InSAR) around the world. Repeat SAR imagery is combined to networks of interferograms from which the ground displacement history in radar line-of-sight direction can be inferred. Ground deformation is caused, e.g. by subsurface magma movements, changes of the ice sheets, tectonic ground   displacements and anthropogenic and man-made land subsidence. We use orbiting SAR sensors from the European Space Agency (ESA), the Italian Space Agency (ASI), the German Aerospace Center (DLR), the Canadian Space Agency (CSA) and the Japanese Space Exploration Agency (JAXA). Starting in 2020 we will use imagery from NASA’s and India's NISAR satellite. This website features data sets we have been analyzing for our research projects.</p>
        </div> <!-- End panel -->

        <button class="accordion">Instructions</button>
        <div class="panel">
          <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div> <!-- End panel -->

        <!--<button class="accordion">Creators</button>
        <div class="panel">
          <p>
            <strong>Client:</strong>Prof. Falk Amelung<br>
            <strong>Designers and Programmers:</strong>
            <ul>
              <li>Jeffrey Lin</li>
              <li>Krystina Scott</li>
              <li>Milen Buchillon-Triff</li>
              <li>Sherman Hewitt</li>
              <li>Xavier Aballa</li>
              <li>Zishi Wu</li>
              <li>Alfredo Terrero</li>
            </ul>

          </p>
        </div>-->
      </div> <!-- End menu -->

      <h2>Line-of-sight displacement time-series</h2>

      <div id="chartContainer" class="side-item graph">
        <!--<canvas id="chart"></canvas>-->
      </div>

      <!-- <div class="side-item upload-button">
        {!! Form::open(array('action' => 'MyController@convertData','method'=>'POST', 'files'=>true)) !!}
        {!! Form::label('data', 'Upload File:') !!}
        {!! Form::file('data') !!}
        {!! Form::submit('Upload'); !!}
        {!! Form::close() !!}

      </div> -->
      <!--insert pop up button for selecting areas to view here-->
      <div class='wrap'>
        <div class='content'>
         <div class="modal-header" id="close-button-parent">
          <div id="close-button-child">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close" id="close-button"><span aria-hidden="true">&times;</span></button>
          </div>
        </div>
        <!--search bar-->
        <div class="input-group">
          <span class="input-group-btn">
            <button class="btn btn-default" id="search-button" type="button">Search</button>
          </span>
          <input type="text" class="form-control" placeholder="Search for..." id="search-input">
        </div>         
          <!-- <div class="modal-header" id="close-button-parent">
            <div id="close-button-child">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" id="close-button"><span aria-hidden="true">&times;</span></button>
            </div>
          </div> -->
          <!-- table to select dataset from-->
          <table class='table' id='myTable'>            
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody id='tableBody'></tbody>
          </table>          
        </div>
      </div>
      <div class="overlay_toggle">
        <label>Connect dots</label>
        <div class="toggle-button" id="dot-toggle-button">
          <button></button>          
        </div>
      </div>
      <div>
        <button class="btn btn-primary-outline" id="popupButton">Select Dataset</button>
      </div>

      <p class="funding">The UM geodesy lab is funded by NASA and NSF.</p>
      <div class="logos">
        <img src="img/nasa.png" alt="nasa_logo" height="100px" width="auto">
        <img src="img/nsf1.gif" alt="nsf_logo" height="100px" width="auto" class="logo2">
      </div>
    </div> <!-- End side-item-box -->
  </div> <!-- End side-bar -->
  <?php
    echo "
      <script type=\"text/javascript\">
        var fileName = \"$fileName\";
      </script>
      ";
    ?>
  <script type="text/javascript" src="js/SquareSelector.js"></script>
  <script type="text/javascript" src="js/mainMap.js"></script>
  <script type="text/javascript" src="js/mainPage.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBm77jFIq1iM3mpL5CgB1uvW6jGcefbIYs"
  async defer></script>
</body>
</html>
