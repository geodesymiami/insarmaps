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
      $json = [];
      // hard coded until zishi is back
      $decimal_dates = json_encode([2006.7287671233,2006.9808219178,2007.4849315068,2007.6109589041,2007.7369863014,2007.8630136986,2007.9890410959,2008.1150684932,2008.2410958904,2008.3671232877,2008.4931506849,2008.7452054795,2008.8712328767,2008.997260274,2009.1205479452,2009.498630137,2009.6246575342,2009.7506849315,2010.002739726,2010.1287671233,2010.2547945205,2010.3808219178,2010.5068493151,2010.6328767123,2010.8849315068,2011.1369863014,2011.2630136986]);
      $string_dates = json_encode(["20060924","20061225","20070627","20070812","20070927","20071112","20071228","20080212","20080329","20080514","20080629","20080929","20081114","20081230","20090214","20090702","20090817","20091002","20100102","20100217","20100404","20100520","20100705","20100820","20101120","20110220","20110407"]);

      
      $json["decimal_dates"] = json_decode($decimal_dates);

      
      $json["string_dates"] = json_decode($string_dates);

      $query = "SELECT *, st_astext(wkb_geometry) from " . $area . " where p = " . $pointNumber . " AND c = " . $chunk;

      $points = DB::select($query);
      foreach ($points as $point) {
        $json["displacements"] = $this->postgresToPHPArray($point->d);
      }
      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
      echo "Point Not found";
    }
    
  }

  private function postgresToPHPArray($pgArray) {
    $postgresStr = trim($pgArray, "{}");
    $elmts = explode(",", $postgresStr);
    return $elmts;
  }

  public function getPoints($area, $points = null) {
    try {
      $json = [];    

      $json["displacements"] = [];

      $pointsArray = explode("/", $points);      
      $pointsArrayLen = count($pointsArray);

      $decimal_dates = json_encode([2006.7287671233,2006.9808219178,2007.4849315068,2007.6109589041,2007.7369863014,2007.8630136986,2007.9890410959,2008.1150684932,2008.2410958904,2008.3671232877,2008.4931506849,2008.7452054795,2008.8712328767,2008.997260274,2009.1205479452,2009.498630137,2009.6246575342,2009.7506849315,2010.002739726,2010.1287671233,2010.2547945205,2010.3808219178,2010.5068493151,2010.6328767123,2010.8849315068,2011.1369863014,2011.2630136986]);
      $string_dates = json_encode(["20060924","20061225","20070627","20070812","20070927","20071112","20071228","20080212","20080329","20080514","20080629","20080929","20081114","20081230","20090214","20090702","20090817","20091002","20100102","20100217","20100404","20100520","20100705","20100820","20101120","20110220","20110407"]);
      $json["decimal_dates"] = json_decode($decimal_dates);
      $json["string_dates"] = json_decode($string_dates);
      $query = "SELECT *, st_astext(wkb_geometry) from " . $area . " where p = ANY (VALUES ";
      $query2 = "SELECT *, st_astext(wkb_geometry) from " . $area . " where c = ANY (VALUES ";

      for ($i = 0; $i < $pointsArrayLen - 1; $i++) {
        $curPointInfo = $pointsArray[$i];
        $curPoint = explode(":", $curPointInfo);
        $curPointNum = $curPoint[1];
        $curChunk = $curPoint[0];

        $query = $query . "(" . $curPointNum . "),"; 
        $query2 = $query2 . "(" . $curChunk . "),";
      }

      // add last ANY values without comma
      $query = $query . "(" . $pointsArray[$pointsArrayLen - 1][1] . "))"; 
      $query2 = $query2 . "(" . $pointsArray[$pointsArrayLen - 1][0] . "))";

      $fullQuery = $query . " INTERSECT " . $query2;
      // echo $fullQuery;
      $points = DB::select($fullQuery);

      foreach ($points as $point) {
        $displacements = [];
        array_push($displacements, $this->postgresToPHPArray($point->d));
        array_push($json["displacements"], $displacements);
      }     

      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
      echo "Error Getting Points";
    }
  }

  public function getAreas() {
    $json = array();

    try {
      $query = "SELECT * from area";
      $areas = DB::select($query);

      $json["areas"] = [];
      foreach ($areas as $area) {
        $areaName = $area->name;

        $currentArea = [];
        $currentArea["name"] = $areaName;
        
        $hack = 0;
        $currentArea["coords"]["latitude"] = $area->latitude;
        $currentArea["coords"]["longitude"] = $area->longitude;                
        $currentArea["coords"]["num_chunks"] = $area->numchunks;
        array_push($json["areas"], $currentArea);
      }

      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
      echo "error getting areas";
    }
  }
}