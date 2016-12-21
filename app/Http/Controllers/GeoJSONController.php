<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;
use DB;
use Illuminate\Support\Facades\Input;
use Auth;

class GeoJSONController extends Controller {
  private $arrayFormatter;

  public function __construct() {
    $this->arrayFormatter = new PostgresArrayFormatter();
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

  /** @throws Exception */
  private function jsonDataForPoint($area, $pointNumber) {
      $json = [];
      // hard coded until zishi is back
      $decimal_dates = null;
      $string_dates = null;

      $query = "SELECT decimaldates, stringdates FROM area WHERE unavco_name=?";
      $dateInfos = DB::select($query, [$area]);

      foreach ($dateInfos as $dateInfo) {
       $decimal_dates = $dateInfo->decimaldates;
       $string_dates = $dateInfo->stringdates;
     }

     $json["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($decimal_dates);


     $json["string_dates"] = $this->arrayFormatter->postgresToPHPArray($string_dates);

     $query = "SELECT *, st_astext(wkb_geometry) from " . $area . " where p = ?";

     $points = DB::select($query, [$pointNumber]);
     foreach ($points as $point) {
      $json["displacements"] = $this->arrayFormatter->postgresToPHPFloatArray($point->d);
    }

    return $json;
  }

  public function getDataForPoint($area, $pointNumber) {
    try {
      $json = $this->jsonDataForPoint($area, $pointNumber);

      echo json_encode($json);
    } catch (\Illuminate\Database\QueryException $e) {
      echo "Point Not found";
    }
  }  

public function getPoints() {
  $points = Input::get("points");
  $polygonVertices = Input::get("polygonVertices");

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
    $query = "SELECT decimaldates, stringdates FROM area WHERE area.unavco_name like ?";
    $dateInfos = DB::select($query, [$area]);

    foreach ($dateInfos as $dateInfo) {
     $decimal_dates = $dateInfo->decimaldates;
     $string_dates = $dateInfo->stringdates;
   }

   $json["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($decimal_dates);
   $json["string_dates"] = $this->arrayFormatter->postgresToPHPArray($string_dates);
   $query = "WITH points(point) AS (VALUES";

   for ($i = 0; $i < $pointsArrayLen - 1; $i++) {       
    $curPointNum = $pointsArray[$i];

    $query = $query . "(" . $curPointNum . "),"; 
  }

    // add last ANY values without comma
  $curPointNum = $pointsArray[$i];
  $query = $query . "(" . $curPointNum . ")) SELECT p, d, wkb_geometry AS lat, ST_Y(wkb_geometry) AS long FROM " . $area . " INNER JOIN points po ON (p = po.point) WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING(";

  $buffer = 1.2;
  $polygonVerticesLen = count($polygonVertices);
  // we receive the vertices always in the order nw, ne, se, sw
  // let us enlarge this polygon by moving the vertices in all directions
  // such that the original points are covered plus some delta area
  for ($i = 0; $i < $polygonVerticesLen; $i++) {
    switch ($i) {
      case 0: // nw
        $polygonVertices[$i]["lng"] -= $buffer;
        $polygonVertices[$i]["lat"] += $buffer;
        break;
      case 1: // ne
        $polygonVertices[$i]["lng"] += $buffer;
        $polygonVertices[$i]["lat"] += $buffer;
        break;
      case 2: // se
        $polygonVertices[$i]["lng"] += $buffer;
        $polygonVertices[$i]["lat"] -= $buffer;
        break;
      case 3: // sw
        $polygonVertices[$i]["lng"] -= $buffer;
        $polygonVertices[$i]["lat"] -= $buffer;
        break;
      default:
        die("invalid counter");
        break;
    }

    $query = $query . $polygonVertices[$i]["lng"] . " " . $polygonVertices[$i]["lat"] . ", ";
  }

  // add initial vertext again to close linestring
  $query = $query . $polygonVertices[0]["lng"] . " " . $polygonVertices[0]["lat"];

  $query = $query .")', 4326)), wkb_geometry) ORDER BY p ASC";

    // echo $fullQuery;
  // echo $query;
  // return;

  $points = DB::select($query);

  foreach ($points as $point) {
    $displacements = $this->arrayFormatter->postgresToPHPFloatArray($point->d);
    array_push($json["displacements"], $displacements);
  }     

  echo json_encode($json);
} catch (\Illuminate\Database\QueryException $e) {
  echo "Error Getting Points";
}
}

private function getExtraAttributesForAreas() {
  $sql = "SELECT * FROM extra_attributes";
  $attributes = DB::select($sql);
  $attributesDict = [];

  foreach ($attributes as $attribute) {
    $key = $attribute->attributekey;
    $value = $attribute->attributevalue;

    $attributesDict[$attribute->area_id][$key] = $value;
  }

  return $attributesDict;
}

public function getAreas() {
  $json = array();

  try {
    $query = "SELECT * from area";
    $areas = DB::select($query);
    $permissionController = new PermissionsController();
    $areasPermissions = $permissionController->getPermissions("area", "area_allowed_permissions", ["area.unavco_name = area_allowed_permissions.area_name"]);

    $userPermissions = NULL;

    // if we aren't logged in, our permission is public
    if (Auth::guest()) {
      $userPermissions = ["public"];
    } else {
      $userPermissions = $permissionController->getUserPermissions(Auth::id(), "users", "user_permissions", ["users.id = user_permissions.user_id"]);
      array_push($userPermissions, "public"); // every user must have public permissions
    }
    $extra_attributes = $this->getExtraAttributesForAreas();

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
          $currentArea["attributekeys"] = $this->arrayFormatter->postgresToPHPArray($area->attributekeys);
          $currentArea["attributevalues"] = $this->arrayFormatter->postgresToPHPArray($area->attributevalues);
          $currentArea["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($area->decimaldates);
          $currentArea["region"] = $area->region;

          $bindings = [$area->id];

          if (isset($extra_attributes[$area->id])) {
            $currentArea["extra_attributes"] = $extra_attributes[$area->id];
          } else {
            $currentArea["extra_attributes"] = NULL;
          }

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

  public function pointDataToTextFile($area, $pointNumber) {
    try {
      $json = $this->jsonDataForPoint($area, $pointNumber);
      $filePath = storage_path() . "/" . $area . ".txt";
      $textFile = fopen($filePath, "w") or die("failed");

      $dates = $json["string_dates"];
      $displacements = $json["displacements"];
      $datesLen = count($dates);

      $lineToWrite = "";

      for ($i = 0; $i < $datesLen; $i++) {
        $lineToWrite .= $dates[$i] . "   " . $displacements[$i] . "\n";
      }

      fwrite($textFile, $lineToWrite);

      $response = response()->download($filePath)->deleteFileAfterSend(true);

      fclose($textFile);

      return $response;
    } catch (\Illuminate\Database\QueryException $e) {
      echo "Error getting point data for text file";

      return NULL;
    }
  }

  // how to get points in polygon for webservices:
  /*
  Assume we have lat, long; delta = 0.0001 but can be refined later
  Polygon we want: 131.20 33.43, 131.20 33.44, 131.21 33.44, 131.21 33.43, 131.20 33.43

  Query with hardcoded lat and long and delta:
  SELECT p, wkb_geometry AS lat, ST_Y(wkb_geometry) AS long
FROM alos_sm_422_650_20070106_20110117
WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING(131.20 33.43, 131.20 33.44, 131.21 33.44, 131.21 33.43, 131.20 33.43)', 4326)), wkb_geometry);

  Order of coordinates we need for general algorithm:
  131.20 33.43, (lat - delta, long - delta)
  131.20 33.44, (lat + delta, long - delta)
  131.21 33.44, (lat + delta, long + delta)
  131.21 33.43, (lat - delta, long + delta)
  131.20 33.43  (lat - delta, long - delta)

  */
}
