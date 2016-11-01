<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;
use DB;
use Illuminate\Support\Facades\Input;
use Auth;

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

  private function postgresToPHPArray($pgArray) {
    $postgresStr = trim($pgArray, "{}");
    $elmts = explode(",", $postgresStr);

    $arrayToReturn = [];
    $arrayLen = count($elmts);

    for ($i = 0; $i < $arrayLen; $i++) {
      $curString = $elmts[$i];      

      if (strpos($curString, "POLYGON") !== false) {
        $curString = substr($curString, 1);
        $curString = $curString . " " . $elmts[$i + 1];
        $curString = $curString . " " . $elmts[$i + 2];
        $curString = $curString . " " . $elmts[$i + 3];
        $curString = substr($curString, 0, strlen($curString) - 1);

        $i += 3;
      }

      array_push($arrayToReturn, $curString);
    }

    return $arrayToReturn;
  }

  private function stringArrayToFloatArray($array) {    
    return array_map("floatval", $array);
  }

  private function postgresToPHPFloatArray($pgArray) {
    $stringArray = $this->postgresToPHPArray($pgArray);

    return $this->stringArrayToFloatArray($stringArray);
  }

  public function getDataForPoint($area, $pointNumber) {
    try {
      $json = [];
      // hard coded until zishi is back
      $decimal_dates = null;
      $string_dates = null;

      $query = "SELECT decimaldates, stringdates FROM area WHERE name='" . $area . "'";
      $dateInfos = DB::select($query);

      foreach ($dateInfos as $dateInfo) {
       $decimal_dates = $dateInfo->decimaldates;
       $string_dates = $dateInfo->stringdates;
     }

     $json["decimal_dates"] = $this->postgresToPHPFloatArray($decimal_dates);


     $json["string_dates"] = $this->postgresToPHPArray($string_dates);

     $query = "SELECT *, st_astext(wkb_geometry) from " . $area . " where p = " . $pointNumber;

     $points = DB::select($query);
     foreach ($points as $point) {
      $json["displacements"] = $this->postgresToPHPFloatArray($point->d);
    }
    echo json_encode($json);
  } catch (\Illuminate\Database\QueryException $e) {
    echo "Point Not found";
  }

}  

public function getPoints() {
  $points = Input::get("points");

  try {
    $json = [];    

    $json["displacements"] = [];
    $decimal_dates = null;
    $string_dates = null;

    $parameters = explode("/", $points);
    $area = $parameters[0];
    $offset = count($parameters) - 2;
    $pointsArray = array_slice($parameters, 1, $offset);

    $pointsArrayLen = count($pointsArray);
    $query = "SELECT decimaldates, stringdates FROM area WHERE area.name like '" . $area . "'";
    $dateInfos = DB::select($query);

    foreach ($dateInfos as $dateInfo) {
     $decimal_dates = $dateInfo->decimaldates;
     $string_dates = $dateInfo->stringdates;
   }

   $json["decimal_dates"] = $this->postgresToPHPFloatArray($decimal_dates);
   $json["string_dates"] = $this->postgresToPHPArray($string_dates);
   $query = "SELECT *, st_astext(wkb_geometry) from " . $area . " where p = ANY (VALUES ";

   for ($i = 0; $i < $pointsArrayLen - 1; $i++) {       
    $curPointNum = $pointsArray[$i];

    $query = $query . "(" . $curPointNum . "),"; 
  }

    // add last ANY values without comma
  $curPointNum = $pointsArray[$i];
  $query = $query . "(" . $curPointNum . ")) ORDER BY p ASC";

    // echo $fullQuery;
  $points = DB::select($query);

  foreach ($points as $point) {
    $displacements = $this->postgresToPHPFloatArray($point->d);
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
    $permissionController = new PermissionsController();
    $areasPermissions = $permissionController->getPermissions("area", "area_allowed_permissions", ["area.name = area_allowed_permissions.area_name"]);

    $userPermissions = NULL;

    // if we aren't logged in, our permission is public
    if (Auth::guest()) {
      $userPermissions = ["public"];
    } else {
      $userPermissions = $permissionController->getUserPermissions(Auth::id(), "users", "user_permissions", ["users.id = user_permissions.user_id"]);
      array_push($userPermissions, "public"); // every user must have public permissions
    }

    $json["areas"] = [];
    foreach ($areas as $area) {
      $unavco_name = $area->unavco_name;
      $project_name = $area->project_name;

      $currentArea = [];
      $currentArea["unavco_name"] = $unavco_name;
      $currentArea["project_name"] = $project_name;

      // do we have info for that area in the DB? if not, we assume it's public
      $curAreaPermissions = NULL;
      if (isset($areasPermissions[$unavco_name])) {
        $curAreaPermissions = $areasPermissions[$unavco_name];
      } else {
        $curAreaPermissions = ["public"];
      }

      foreach ($curAreaPermissions as $curAreaPermission) {
        if (in_array($curAreaPermission, $userPermissions)) {
          $currentArea["coords"]["latitude"] = $area->latitude;
          $currentArea["coords"]["longitude"] = $area->longitude;                
          $currentArea["num_chunks"] = $area->numchunks;
          $currentArea["country"] = $area->country;
          $currentArea["attributekeys"] = $this->postgresToPHPArray($area->attributekeys);
          $currentArea["attributevalues"] = $this->postgresToPHPArray($area->attributevalues);
          $currentArea["region"] = $area->region;
          array_push($json["areas"], $currentArea);
          continue;
        }
      }
    }

    echo json_encode($json);
  } catch (\Illuminate\Database\QueryException $e) {
    echo "error getting areas";
  }
}
}