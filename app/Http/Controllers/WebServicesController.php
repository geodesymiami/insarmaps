<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DB;

class WebServicesController extends Controller
{
    // main entry point into web services
    public function processRequest(Request $request) {
    	$requests = $request->all();
    	$len = count($requests);

    	// we need latitude, longitude, and dataset
    	// set lat and long to 1000.0 (impossible value) and dataset to empty string
    	// if these initial values are retained then we did not get enough info to query
    	$latitude = 1000.0;	
    	$longitude = 1000.0;
    	$dataset = "";

    	foreach ($requests as $key => $value) {
    		if ($key == "latitude") {
    			$latitude = $value ;
    		} 
    		else if ($key == "longitude") {
    			$longitude = $value ;
    		} 
    		else if ($key == "dataset") {
    			$dataset = $value;
    		}
    	}

    	if ($latitude == 1000.0 || $longitude == 1000.0 || strlen($dataset) == 0) {
    		echo "Error: Incomplete/Invalid Data for Retrieving a Point";
    		return NULL;
    	}

    	// perform query
    	$delta = 0.0001;	// range of error for latitude and longitude values, can be changed as needed
    	$low_lat = $latitude - $delta;
    	$high_lat = $latitude + $delta;
    	$low_long = $longitude - $delta;
    	$high_long = $longitude + $delta;

    	// 5 coordinates for polygon, 10 values pushed
      $p1_lat = $latitude - $delta;
      $p1_long = $longitude - $delta;
      $p2_lat = $latitude + $delta;
      $p2_long = $longitude - $delta;
      $p3_lat = $latitude + $delta;
      $p3_long = $longitude + $delta;
      $p4_lat = $latitude - $delta;
      $p4_long = $longitude + $delta;
      $p5_lat = $latitude - $delta;
      $p5_long = $longitude - $delta;

      $query = " SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM " . $dataset . "
            WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING( " . $p1_lat . " " . $p1_long . ", " . $p2_lat . " " . $p2_long . ", " . $p3_lat . " " . $p3_long . ", " . $p4_lat . " " . $p4_long . ", " . $p5_lat . " " . $p5_long . ")', 4326)), wkb_geometry);";
     
     	$points = DB::select(DB::raw($query));

      // get dates
      // $query = "SELECT decimaldates, stringdates FROM area WHERE area.unavco_name like ?";
      // $dateInfos = DB::select($query, [$dataset]);

      $json = [];

      foreach ($points as $point) {
        $displacements = $this->postgresToPHPFloatArray($point->d); // that good?
        $json["point"][$point->p] = $point->d;
      }

      return json_encode($json);
    }
}
