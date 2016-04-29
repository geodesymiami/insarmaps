<!DOCTYPE html>
<html>
    <head>
        <title>InSAR Map</title>
        <!--link rel=stylesheet href=index.css type=text/css-->
        <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.css" />
        <!--jQuery-->
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
        <!--leaflet-->

        <script src="http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet.js"></script>
        <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v0.14.3/mapbox-gl.js'></script>
      <!--<script src="https://code.jquery.com/jquery-1.12.0.min.js"></script>
        <script type="text/javascript" src="jquery-2.2.2.min.js"></script>
    <script src="https://code.jquery.com/jquery-migrate-1.2.1.min.js"></script>-->
        <script src="https://code.jquery.com/jquery-1.12.2.js"></script>
       <!--script src='/geojson-vt-dev.js'></script-->
        <!--script type="text/javascript" src='scripts.js'></script-->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/1.0.2/Chart.min.js"></script>

        <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v0.14.3/mapbox-gl.css' rel='stylesheet' />
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

        h1{
          font-family: 'Carter One', cursive;
          font-size: 32px;
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

          margin-top: 5em;

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
        <h1>Browser-based inSAR Time Series Viewer</h1>
      </div>
      <!--<div class="side-item description">
        <p>Description of inSAR map web application.</p>
      </div>-->


<div class="menu">
  <button class="accordion">What is the InSar Project?</button>
  <div class="panel">
    <p>The InSar map is a product that allows users to view geographic data that spans within a 20 year time frame.The data presented consists of images recorded by satellites that keep track of ground elevation levels at various parts of the Earth. Users should be able to select a specific part of a generated map and show change in elevation data for that area.</p>
  </div> <!-- End panel -->

  <button class="accordion">Instructions</button>
  <div class="panel">
    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
  </div> <!-- End panel -->

  <button class="accordion">Creators</button>
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
  </div>
</div> <!-- End menu -->

        <h2>Elevations of selected area: </h2>

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
    </body>
</html>
