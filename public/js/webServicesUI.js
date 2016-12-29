$(window).load(function(){
  // $(".class-name").val()
  // $("#id-name").val()

  $( "#enter-button" ).click(function() {
  	// required parameters: longitude, latitude, dataset
  	// optional parameters: startTime, endTime, outputType
  	var longitude = $("#input-longitude").val();
  	var latitude = $("#input-latitude").val();
  	var dataset = $("#input-dataset").val();
  	var startTime = $("#input-startTime").val();
  	var endTime = $("#input-endTime").val();
  	var outputType = $("#input-outputType").val();

  	// parameters to perform query based on user inputted longitude, latitude, dataset
  	var delta = 0.0005;
    var p1_lat = latitude - delta;
    var p1_long = longitude - delta;
    var p2_lat = latitude + delta;
    var p2_long = longitude - delta;
    var p3_lat = latitude + delta;
    var p3_long = longitude + delta;
    var p4_lat = latitude - delta;
    var p4_long = longitude + delta;
    var p5_lat = latitude - delta;
    var p5_long = longitude - delta;
    var query = "http://homestead.app/WebServices?";

  	// TODO: handle case where user inputs startTime but not endTime, and vice versa case

  	// check required parameters are not empty - if so construct webservice url
  	// ex: http://homestead.app/WebServices?longitude=131.67&latitude=32.53&dataset=Alos_SM_72_2970_2980_20070205_20110403&startTime=1990-12-20&endTime=2020-12-20&outputType=plot
  	if (longitude.length > 0 && latitude.length > 0 && dataset.length > 0) {
		query += "longitude=" + longitude + "&latitude=" + latitude + "&dataset=" + dataset;
		console.log(query);
  	} 
  	else {
  	  console.log("Error: please input all required parameters");
  	}

  	// Logic for query
  	/* 
  	$query = " SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM " . $dataset . "
            WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING( " . $p1_long . 
            " " . $p1_lat . ", " . $p2_long . " " . $p2_lat . ", " . $p3_long . " " . $p3_lat . ", " . $p4_long . " " . $p4_lat . ", " . $p5_long . " " . $p5_lat . ")', 4326)), wkb_geometry);";
    */
  });

});