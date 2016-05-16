<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;

session_start();

class GeoJSONController extends Controller {
  // take in array of date strings and return array of date objects
  private function dateStringToDateObjects($date_strings) {
    $dates = [];
    $numDates = count($date_strings);
    for ($i = 0; $i < $numDates; $i++) {
      $date = $date_strings[$i];
      $year = substr($date, 0, 4);
      $month = substr($date, 4, 2);
      $day = substr($date, 6, 2);
      // make new date object and add to array - show me conce
      try {
        $new_date = new DateTime($year . "-" . $month . "-" . $day);
        array_push($dates, $new_date);
      } catch (Exception $e) {
        echo $e->getMessage();
        exit(1);
      } 
    }
    return $dates;
  }

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

  // find how many days have elapsed in a date object
  private function getDaysElapsed($date) {
    $date2 = new DateTime($date->format("Y") . "-" . 01 . "-" . 1);
    $interval = $date->diff($date2);
    return floatval($interval->format("%a"));
  }

  // convert date in decimal - for example, 20060131 is Jan 31, 2006
  // 31 days have passed so decimal format = [2006 + (31/365)] = 2006.0849
  // take an array of date objects and return an array of date decimals
  private function convertDatesToDecimalArray($date_array) {
    $decimals = [];
    $numDates = count($date_array);
    for ($i = 0; $i < $numDates; $i++) {
      array_push($decimals, (floatval($date_array[$i]->format("Y")) + $this->getDaysElapsed($date_array[$i])/365.0));
    }   
    return $decimals;
  }

  // function to calculate linear regression
  // credits - https://richardathome.wordpress.com/2006/01/25/a-php-linear-regression-function/
  /**
   * linear regression function
   * @param $x array x-coords
   * @param $y array y-coords
   * @returns array() m=>slope, b=>intercept
   */
  private function linear_regression($x, $y) {

    // calculate number points
    $n = count($x);

    // ensure both arrays of points are the same size
    if ($n != count($y)) {

      trigger_error("linear_regression(): Number of elements in coordinate arrays do not match.", E_USER_ERROR);

    }

    // calculate sums
    $x_sum = array_sum($x);
    $y_sum = array_sum($y);

    $xx_sum = 0;
    $xy_sum = 0;

    for($i = 0; $i < $n; $i++) {

      $xy_sum+=($x[$i]*$y[$i]);
      $xx_sum+=($x[$i]*$x[$i]);

    }

    // calculate slope
    $m = (($n * $xy_sum) - ($x_sum * $y_sum)) / (($n * $xx_sum) - ($x_sum * $x_sum));

    // calculate intercept
    $b = ($y_sum - ($m * $x_sum)) / $n;

    // return result
    return array("m"=>$m, "b"=>$b);

  }

  // gets a json file chunk, after calculating every point's color
  public function getJSONFileChunk($fileChunkNumber) {
    // make file path be the resulf of session get
    $filePath = $_SESSION['jsonFolderPath'] . "/chunk_";
    $file = $fileChunkNumber;
    $file = $filePath . $file . ".json";
    $fileContents = file_get_contents($file);
    $json = json_decode($fileContents, true);

    $numFeatures = count($json["features"]);

    // var_dump($json);

    for ($i = 0; $i < $numFeatures; $i++) {
      $dates = $this->dateStringToDateObjects($json["dates"]);
      $dates = $this->convertDatesToDecimalArray($dates);
      $displacements = $json["features"][$i]["properties"]["displacement"];
      $regression = $this->linear_regression($dates, $displacements);
      $slope = $regression["m"];
      $epsilon = 0.001;


      // decide color
      if ($slope < $epsilon && $slope > 0) {
        $json["features"][$i]["properties"]["marker-symbol"] = "yellowMarker";
      } else if ($slope < $epsilon && $slope < 0) {
        $json["features"][$i]["properties"]["marker-symbol"] = "redMarker";
      } else {
        $json["features"][$i]["properties"]["marker-symbol"] = "greenMarker";
      }
    }

    // take out displacements for client
    for ($i = 0; $i < $numFeatures; $i++) {
      unset($json["features"][$i]["properties"]["displacement"]);
    }

    echo json_encode($json);
  }

  public function getDataForPoint($point) {   
  // make file path be the resulf of session get
    $filePath = $_SESSION['jsonFolderPath'] . "/chunk_";
    $jsonToReturn = array();

    $tokens = explode(":", $point);
    $fileNum = $tokens[0];
    $lat = $tokens[1];
    $long = $tokens[2];

    $file = $filePath . $fileNum . ".json";
    $fileContents = file_get_contents($file);
    $json = json_decode($fileContents, true);

    $numFeatures = count($json["features"]);
    $epsilon = 0.00000001; // floats are inherently inaccurate to compare, especially since the JSON has such accurate numbers
    $jsonToReturn["dates"] = $json["dates"];

    for ($i = 0; $i < $numFeatures; $i++) {
      $fileLat = $json["features"][$i]["geometry"]["coordinates"][0];
      $fileLong = $json["features"][$i]["geometry"]["coordinates"][1];

      if (abs($lat - $fileLat) < $epsilon && abs($long - $fileLong) < $epsilon) {
        $jsonToReturn["displacements"] = $json["features"][$i]["properties"]["displacement"];
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
