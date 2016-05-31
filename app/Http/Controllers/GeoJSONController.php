<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;

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

  public function getDataForPoint($area, $point) {   
  // make file path be the resulf of session get
    $filePath = storage_path() . "/json/" . $area . "/chunk_";
    $jsonToReturn = array();

    $tokens = explode(":", $point);
    $fileNum = $tokens[0];
    $pointNumber = $tokens[1];
    $lat = $tokens[2];
    $long = $tokens[3];

    $file = $filePath . $fileNum . ".json";
    $fileContents = file_get_contents($file);
    $json = json_decode($fileContents, true);

    $numFeatures = count($json["features"]);
    $epsilon = 0.00000001; // floats are inherently inaccurate to compare, especially since the JSON has such accurate numbers
    $jsonToReturn["dates"] = $json["dates"];

    for ($i = 0; $i < $numFeatures; $i++) {
      $filePointNumber = $json["features"][$i]["properties"]["p"];

      if ($pointNumber == $filePointNumber) {
        $jsonToReturn["displacements"] = $json["features"][$i]["properties"]["d"];
        echo json_encode($jsonToReturn);
        break;
      }
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
    // 2d array stores [path_name, num_files]
    $array = [];
    for ($i = 0; $i < count($dir_array); $i++) {
      $subArray = $this->getNumJSONFiles($storage_path . $dir_array[$i]);
      array_push($array, $subArray);
    }

    echo json_encode($array);
  }
}
