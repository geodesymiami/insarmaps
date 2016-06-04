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

  public function getDataForPoint($chunk, $pointNumber) {
    try {
      $query = "SELECT data->'dates' from pythonTest WHERE id = " . $chunk;
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
    // check the storage_path for directories
    $storage_path = storage_path() . "/json/";
    $files = scandir($storage_path);
    $length = count($files);

    $dir_array = [];
    // ignore index 0 and 1 since ./ and ../
    // we should actually check for ./ and ../ instead of this cheap hack
    for ($i = 2; $i < $length; $i++) {  
      if (is_dir($storage_path . $files[$i])) {
        array_push($dir_array, $files[$i]); 
      }
    }
    // 2d array stores [path_name, num_files, lat_of_first_point, long_first_point]
    $array = [];
    for ($i = 0; $i < count($dir_array); $i++) {
      $subArray = $this->getNumJSONFiles($storage_path . $dir_array[$i]);
      // get a random point
      $file = $storage_path . $dir_array[$i] . "/chunk_1.json";
      $fileContents = file_get_contents($file);
      $json = json_decode($fileContents, true);
      // save some memory
      unset($fileContents);
      $long = $json["features"][0]["geometry"]["coordinates"][0];
      $lat = $json["features"][0]["geometry"]["coordinates"][1];

      array_push($subArray, $lat);
      array_push($subArray, $long);

      array_push($array, $subArray);
    }

    echo json_encode($array);
  }
}
