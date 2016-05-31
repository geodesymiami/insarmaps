<!DOCTYPE html>
<html>
<head>
 <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.css" />
 <link rel="stylesheet" href="css/mainPage.css" />
 <!--jQuery-->
 <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
 <!--leaflet-->
 <script src="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.js"></script>
 <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v0.18.0/mapbox-gl.js'></script>
 <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v0.18.0/mapbox-gl.css' rel='stylesheet' />
    <!--<script src="https://code.jquery.com/jquery-1.12.0.min.js"></script>
    <script type="text/javascript" src="jquery-2.2.2.min.js"></script>
    <script src="https://code.jquery.com/jquery-migrate-1.2.1.min.js"></script>-->
    <script src="https://code.jquery.com/jquery-1.12.2.js"></script>
    <!--script src='/geojson-vt-dev.js'></script-->
    <!--script type="text/javascript" src='scripts.js'></script-->
    <link href="vendor/mapbox-gl-draw.css" rel="stylesheet" />    <script type="text/javascript" src="vendor/mapbox-gl-draw.js"></script>
    <script type="text/javascript" src="js/regression.js"></script>
    <script type="text/javascript" src="js/canvasjs.min.js"></script>
  </head>
  <body>
    <div id="map-container">
    </div>
    <div class="side-bar">
      <div class="side-item-box">
        <!--div class="side-item move-button"></div-->
        <div class="side-item title">
          <h1>University of Miami’s inSAR Time Series Viewer</h1>
        </div>
        <br><br>
        <div id="map-type-menu">
          <input id='basic' type='radio' name='rtoggle' value='basic' checked='checked'>
          <label for='basic'>basic</label>
          <input id='streets' type='radio' name='rtoggle' value='streets'>
          <label for='streets'>streets</label>
          <input id='satellite' type='radio' name='rtoggle' value='satellite'>
          <label for='satellite'>satellite</label>
        </div>
        <div class="overlay_toggle">
          <label>Turn on/off data overlay</label>
          <div class="toggle-button">
            <button></button>
          </div>
        </div>
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
        <canvas id="chart"></canvas>
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
          <!-- table to select dataset from-->
          <table class='table' id='myTable'>
            <thead>
              <tr>
                <th>Dataset</th>
              </tr>
            </thead>
            <tbody id='tableBody'></tbody>
          </table>
        </div>
      </div>
      <button><a class='button glyphicon glyphicon-plus' id="popupButton" href='#'>Select Area</a></button>

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
  <script type="text/javascript" src="js/mainMap.js"></script>
  <script>

    var acc = document.getElementsByClassName("accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
      acc[i].onclick = function(){
        this.classList.toggle("active");
        this.nextElementSibling.classList.toggle("show");
      }
    }
  </script>
  <script type="text/javascript">
    var layerList = document.getElementById('map-type-menu');
    var inputs = layerList.getElementsByTagName('input');

    function switchLayer(layer) {
      var layerId = layer.target.id;
      myMap.map.setStyle(layerId + "Style.json");
      currentPoint = 1; // reset current point
      var fileToLoad = currentPoint.toString();
      // load in our sample json
      myMap.loadJSONFunc(fileToLoad, "file", myMap.JSONCallback);
    }

    for (var i = 0; i < inputs.length; i++) {
      inputs[i].onclick = switchLayer;
    }

    // enum-style object to denote toggle state
    var ToggleStates = {
      OFF: 0,
      ON: 1
    }
    var toggleState = ToggleStates.ON;

    function getGEOJSON(area) {
      // currentPoint = 1;
      currentArea = area;

      // var query = {
      //   "area": area,
      //   "fileChunk": currentPoint
      // }

      // loadJSON(query, "file", myMap.JSONCallback);
       //var tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://localhost:8888/t/{z}/{x}/{y}.pbf"], "vector_layers":[]};
       
       myMap.tileJSON = {"minzoom":0,"maxzoom":14,"center":[130.308838,32.091882,14],"bounds":[130.267778,31.752321,131.191112,32.634544],"tiles":["http://insarvmcsc431.cloudapp.net:8888/t/{z}/{x}/{y}.pbf"], "vector_layers":[]};
       console.log(myMap.tileJSON);
       for (var i = 1; i < 944; i++) {
        var layer = {"id":"chunk_" + i,"description":"","minzoom":0,"maxzoom":14,"fields":{"c":"Number","m":"Number","p":"Number"}};
        myMap.tileJSON.vector_layers.push(layer);
      }

      myMap.initLayer(myMap.tileJSON);
    }
    // when site loads, turn toggle on
    $(window).load(function() {
      $(".toggle-button").toggleClass('toggle-button-selected');
      $('#popupButton').on('click', function() {
        $('.wrap, #popupButton').toggleClass('active');

        // get json response and put it in a table
        loadJSON("", "areas", function(response) {         
          var json = JSON.parse(response);

          // add our info in a table, first remove any old info
          $(".wrap").find(".content").find("#myTable").find("#tableBody").empty();
          for (var i = 0; i < json.length; i++) {
            var curArray = json[i];
            var subDirectories = curArray[0].split("/");
            var dirName = subDirectories[subDirectories.length - 1];
            var dirFullName = curArray[0];
            var dirSize = curArray[1];

            $("#tableBody").append("<tr id=" + dirName +  "><td value='" + dirFullName + "''>" + dirName + "</td></tr>");

            // make cursor change when mouse hovers over row
            $("#" + dirName + "").css("cursor", "pointer");
            // set the on click callback function for this row
            $("#" + dirName + "").click(function() {
              $('.wrap, #popupButton').toggleClass('active');
              getGEOJSON(dirName);
            });
          }
        });
        return false;
      });
    });
    /*TOGGLE BUTTON*/
    $(document).on('click', '.toggle-button', function() {
      $(this).toggleClass('toggle-button-selected');

      // change states
      if (toggleState == ToggleStates.ON) {
        toggleState = ToggleStates.OFF;
      } else {
        toggleState = ToggleStates.ON;
      }

      // on? add layers, otherwise remove them
      if (toggleState == ToggleStates.ON) {
        myMap.map.addSource("vector_layer_", {
            type: 'vector',
            tiles: myMap.tileJSON['tiles'],
            minzoom: myMap.tileJSON['minzoom'],
            maxzoom: myMap.tileJSON['maxzoom'],
            bounds: myMap.tileJSON['bounds']
        });
        for (var i = 0; i < myMap.layers_.length; i++) {
          var layer = myMap.layers_[i];

          myMap.map.addLayer(layer);
        }
      } else {
        myMap.map.removeSource("vector_layer_");

        for (var i = 0; i < myMap.layers_.length; i++) {
          var id = myMap.layers_[i].id;

          // don't remove the base map, only the points
          if (id !== "simple-tiles") {
            myMap.map.removeLayer(id);
          }
        }
      }

    });
  </script>
</body>
</html>
