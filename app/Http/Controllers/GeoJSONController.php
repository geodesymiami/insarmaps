<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;
use DB;

session_start();

class GeoJSONController extends Controller {

  // returns an array containing folder path as a string and number of json files
  public function getNumJSONFiles($jsonFolderPath) {
    $num_files = 0;
    $files = scandir($jsonFolderPath);
    $len = count($files);
    $pattern = ".json";  // pattern is chunk_<number>.json"
    $array = [$jsonFolderPath];
    for ($i = 0; $i < $len; $i++) {
      if (strpos($files[$i], $pattern) !== false) {
        $num_files++;
      }
    }
    array_push($array, $num_files);
    return $array;
  }

  public function getDataForPoint($area, $chunk, $pointNumber) {
    try {
      $query = "SELECT data->'dates' from " . $area . " WHERE id = " . $chunk;
      $dates = DB::select($query);
      $array = get_object_vars($dates[0]);
      foreach ($array as $key => $dateArray) {
        $json["dates"] = json_decode($dateArray);
      }

      $query = "SELECT data->'features'->" . $pointNumber . "->'properties'->'d' from pythonTest WHERE id = " . $chunk;
      $displacements = DB::select($query);
      $array = get_object_vars($displacements[0]);

      foreach ($array as $key => $displacementArray) {
        $json["displacements"] = json_decode($displacementArray);
      }
      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
        echo "Point Not found";
    }
    
  }

  public function getAreas() {
    $json = array();

    try {
      $query = "SELECT name, data from area";
      $areas = DB::select($query);

      $json["areas"] = [];
      for ($i = 0; $i < count($areas); $i++) {
        $array = get_object_vars($areas[$i]);
        $areaName = $array["name"];

        $currentArea = [];
        $currentArea["name"] = $areaName;
        
        $hack = 0;
        foreach ($array as $key => $area) {
          if ($hack != 0) {
            $currentArea["coords"] = json_decode($area);
            array_push($json["areas"], $currentArea);
          }
          $hack++;
        }
      }

      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
      echo "error getting areas";
    }
  }
}