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

  /**
  * Returns an array containing folder path as a string and number of json files
  *
  * @param string $jsonFolderPath
  * @return array $data - data[0] = jsonFolderPath, data[1] = number of json files
  */
  public function getNumJSONFiles($jsonFolderPath) {

    $num_files = 0;
    $files = scandir($jsonFolderPath);
    $len = count($files);
    $pattern = ".json";  // pattern is chunk_<number>.json"
    $data = [$jsonFolderPath];

    for ($i = 0; $i < $len; $i++) {
      if (strpos($files[$i], $pattern) !== false) {
        $num_files++;
      }
    }

    array_push($data, $num_files);
    return $data;
  }

  /** @throws Exception */
  // TODO: Insert try/catch statement in case query fails
  private function jsonDataForPoint($area, $pointNumber) {
      $json = [];
      // hard coded until zishi is back
      $decimal_dates = NULL;
      $string_dates = NULL;

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

  try {
    $json = [];    

    $json["displacements"] = [];
    $decimal_dates = NULL;
    $string_dates = NULL;

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
  $query = $query . "(" . $curPointNum . ")) SELECT *, st_astext(wkb_geometry) from " . $area . " INNER JOIN points p ON (" . $area . ".p = p.point) ORDER BY p ASC";

    // echo $fullQuery;
  // echo $query;
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

public function getAreas($bbox=NULL) {
  $json = array();

  try {
    $query = "SELECT * from area";
    if ($bbox) {
      $query = "SELECT * FROM area WHERE st_contains(ST_MakePolygon(ST_GeomFromText(" . $bbox . ", 4326)), ST_SetSRID(ST_MakePoint(area.longitude, area.latitude), 4326));";
    }
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
      $currentArea["properties"]["unavco_name"] = $unavco_name;
      $currentArea["properties"]["project_name"] = $project_name;

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
          $currentArea["properties"]["num_chunks"] = $area->numchunks;
          $currentArea["properties"]["country"] = $area->country;
          $currentArea["properties"]["attributekeys"] = $this->arrayFormatter->postgresToPHPArray($area->attributekeys);
          $currentArea["properties"]["attributevalues"] = $this->arrayFormatter->postgresToPHPArray($area->attributevalues);
          $currentArea["properties"]["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($area->decimaldates);
          $currentArea["properties"]["string_dates"] = $this->arrayFormatter->postgresToPHPArray($area->stringdates);
          $currentArea["properties"]["region"] = $area->region;

          $bindings = [$area->id];

          if (isset($extra_attributes[$area->id])) {
            $currentArea["properties"]["extra_attributes"] = $extra_attributes[$area->id];
          } else {
            $currentArea["properties"]["extra_attributes"] = NULL;
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
