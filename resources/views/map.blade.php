<!DOCTYPE html>
<html>
<head>
 <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.css" />
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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/1.0.2/Chart.min.js"></script>
    <link href="vendor/mapbox-gl-draw.css" rel="stylesheet" />
    <script type="text/javascript" src="vendor/mapbox-gl-draw.js"></script>
    <style>
      @import url(https://fonts.googleapis.com/css?family=Carter+One);

      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%
      }

      .page-container {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
      }

      .side-bar {
        float: left;
        height: 100%;
        width: 33%;
        background-color: rgb(4,53,101);
        z-index: 10;
        overflow: auto;
      }

      .side-item-box {
        display: block;
        width: 90%;
        margin: 1em auto;
      }

      .side-item {
        display: block;
        /*margin: 1em auto;*/
        width: 100%;
        height: 50px;
        /*background-color: black;*/
      }

      .side-item.title, .side-item.upload-button, .side-item.description {
        /*background-color: white;*/
      }

      .side-item.graph {

        height: 250px;
        background-color: black;
        margin-bottom: 20px;
      }

      #chart {
        width: 100%;
        height: 100%;
      }

      .move-button {
        width: 15%;
        margin-left: 90%;
      }

      #map-container {
        width: 67%;
        height: 100%;
        /*position: absolute;*/
        z-index: 0;
        float: right;
      }

      #map {
        width: 100%;
        height: 100%;
      }

      h1.title {
        font-size: 32px;
        margin-bottom: 2em;
      }

      h1{
        font-family: 'Carter One', cursive;
        color: coral;

      }

      h2{
        font-family: 'Carter One', cursive;
        margin-top: 20px;
        color: coral;
      }

      label{
        color: coral;
        font-family: 'Carter One', cursive;
      }

      #input{
        color: coral;
        font-family: 'Carter One', cursive;
      }

        /*.accordion,
        .accordion dt,
        .accordion dd,
        .accordion figure{

          margin:0;
          padding:0;
        }*/

        .accordion{

          background: DeepSkyBlue;
          border-bottom: 1px solid DodgerBlue;
          border-radius: 7px 7px 0 0;
          color:white;
          font-size: 1.5em;
          margin-top: 0.222em;
          padding: 0.5em 1em;
        }

        .accordion dd{

          border:1px solid DeepSkyBlue;
          border-top: none;
          border-radius: 0 0 7px 7px;
          paddig: 1em;
        }

        button.accordion {
          /*background-color: #eee;
          color: #444;*/
          background-color: DeepSkyBlue;
          border-bottom: 1px solid DodgerBlue;
          cursor: pointer;
          padding: 18px;
          width: 100%;
          border: none;
          text-align: left;
          outline: none;
          font-size: 15px;
          transition: 0.4s;
        }

        button.accordion.active, button.accordion:hover {
          background-color: orange;
          color:black;
        }

        div.panel {
          padding: 0 18px;
          display: none;
          color: white;
          border: 1 px solid orange;
        }

        div.panel.show {

          border: 1px solid orange;
          display: block !important;
          color:white;
        }

        button{
          font-family: 'Carter One', cursive;
        }

        p.ul{
          color:black;
        }

        div.menu{

          margin-top: 2em;

        }

        #map-type-menu {
          padding: 10px;
          font-family: 'Open Sans', sans-serif;
          margin-top:4em;
        }

        .logos{
         margin:2em;   
        }

        .logo2{
          margin-left: 4em;   
        }

        label{
         color:white;
        }

        .funding{
          color:white;
          margin-left: 2em;
        }

        #map-type-menu input[type="radio"]:checked + label {
          color: coral;
        }

        .overlay_toggle>*{
          display: inline-block;
          float: left;
        }

        .toggle-button { 
          background-color: white;
          margin: 5px 0;
          border-radius: 20px;
          border: 2px solid #D0D0D0;
          height: 14px;
          cursor: pointer;
          width: 50px;
          position: relative;
          display: inline-block;
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -moz-user-select: none; 
          margin-left: 2em;
      }

      .toggle-button button { 
        cursor: pointer;
        outline: 0;
        display:block;
        position: absolute;
        left: 0;
        top: 0;
        border-radius: 100%;
        width: 20px;
        height: 20px;
        background-color: white;
        float: left;
        margin: -3px 0 0 -3px;
        border: 2px solid #D0D0D0;
        transition: left 0.3s; 
      }

      .toggle-button-selected { 
         background-color: coral; border: 2px solid coral;
       }

      .toggle-button-selected button {
        left: 37px;
        top: 0;
        margin: 0;
        border: none;
        width: 20px;
        height: 22px;
        box-shadow: 0 0 0px rgba(0,0,0,0.1); 
      }

      </style>
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

      <div class="side-item graph">
        <canvas id="chart"></canvas>
      </div>

      <div class="side-item upload-button">
        {!! Form::open(array('action' => 'MyController@convertData','method'=>'POST', 'files'=>true)) !!}
        {!! Form::label('data', 'Upload File:') !!}
        {!! Form::file('data') !!}
        {!! Form::submit('Upload'); !!}
        {!! Form::close() !!}

      </div>
      <p class="funding">The UM geodesy lab is funded by NASA and NSF. This website resulted from Spring 2016 CSC 431 class. The student designers and programmers were Jeffrey Lin, Krystina Scott, Milen Buchillon-Triff,Sherman Hewitt, Xavier Aballa, Zishi Wu, and Alfredo Terrero.</p>  
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

    /*TOGGLE BUTTON*/
    $(document).on('click', '.toggle-button', function() {
      $(this).toggleClass('toggle-button-selected'); 
    });
  </script>
</body>
</html>
