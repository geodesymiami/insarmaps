<?php
// TODO: change echo json_encodes to proper laravel response objects

namespace App\Http\Controllers;

use Auth;
use DB;
use Illuminate\Support\Facades\Input;

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
        $pattern = ".json"; // pattern is chunk_<number>.json"
        $data = [$jsonFolderPath];

        for ($i = 0; $i < $len; $i++) {
            if (strpos($files[$i], $pattern) !== false) {
                $num_files++;
            }
        }

        array_push($data, $num_files);
        return $data;
    }

    // this function doesn't sanitize $area to make sure user is allowed this area
    // we trust that users only have unavco_name of area they are allowed to view
    // but what if user originally has permission for an area, x, and then
    // this permission is taken away? he still has the unavco name...
    // solution is to here also check if area is in the permitted areas of user
    // but i have bigger fish to fry and permission system doesn't seem to be very important
    /** @throws Exception */
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

        $query = 'SELECT *, st_astext(wkb_geometry) from "' . $area . '" where p = ?';

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
// TODO: add middlewear to protect against datasets to which user has no permissions. Extremely low priority at this point (7/14).
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
            $query = 'SELECT decimaldates, stringdates FROM area WHERE area.unavco_name like ?';
            $dateInfos = DB::select($query, [$area]);

            foreach ($dateInfos as $dateInfo) {
                $decimal_dates = $dateInfo->decimaldates;
                $string_dates = $dateInfo->stringdates;
            }

            $json["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($decimal_dates);
            $json["string_dates"] = $this->arrayFormatter->postgresToPHPArray($string_dates);
            $query = "WITH points(point) AS (VALUES";
            $preparedValues = [];

            for ($i = 0; $i < $pointsArrayLen - 1; $i++) {
                $curPointNum = $pointsArray[$i];
                $query = $query . "(?),";
                array_push($preparedValues, $curPointNum);
            }

            // add last ANY values without comma
            $curPointNum = $pointsArray[$i];
            $query = $query . '(' . $curPointNum . ')) SELECT *, st_astext(wkb_geometry) from "' . $area . '" INNER JOIN points p ON ("' . $area . '".p = p.point) ORDER BY p ASC';

            $points = DB::select(DB::raw($query), $preparedValues);

            foreach ($points as $point) {
                $displacements = $this->arrayFormatter->postgresToPHPFloatArray($point->d);
                array_push($json["displacements"], $displacements);
            }

            echo json_encode($json);
        } catch (\Illuminate\Database\QueryException $e) {
            echo "Error Getting Points";
        }
    }

    private function getAttributesForAreas($areas, $table) {
        $sql = "SELECT * FROM " . $table;
        $preparedValues = [];
        if ($areas) {
            $sql .= " WHERE area_id IN(";
            foreach ($areas as $areaID => $area) {
                $sql .= "?,";
                array_push($preparedValues, $areaID);
            }
            // replace last comma with )
            $sql[strlen($sql) - 1] = ')';
        }

        $attributes = DB::select(DB::raw($sql), $preparedValues);
        $attributesDict = [];

        foreach ($attributes as $attribute) {
            $key = $attribute->attributekey;
            $value = $attribute->attributevalue;

            $attributesDict[$attribute->area_id][$key] = $value;
        }

        return $attributesDict;
    }

    // getting valid areas for which user has permission should be done
    // in sql and not with multiple calls to db. this will imply each
    // user having a default permission of public among other things as well
    // as more complicated sql. not worth it at this point for marginal speed
    // increase as permissions system isn't an important system and he
    // said max of around 1000 datasets so it won't make a huge speedup
    public function getPermittedAreasWithQuery($query, $preparedValues = NULL) {
        $areasArray = [];
        try {
            $permissionController = new PermissionsController();
            $areas = NULL;
            $queryToFilterAreas = $permissionController->getQueryForFindingPermittedAreas(Auth::id());
            $query .= " WHERE area.id IN " . $queryToFilterAreas["sql"];
            $allPreparedValues = $queryToFilterAreas["preparedValues"];
            if ($preparedValues) {
                array_merge($preparedValues, $allPreparedValues);
            }

            $areas = DB::select(DB::raw($query), $allPreparedValues);

            if (count($areas) == 0) {
                return $areas;
            }

            foreach ($areas as $area) {
                $areasArray[$area->id] = $area;
            }

            // get all attributes for areas
            $extraAttributes = $this->getAttributesForAreas($areasArray, "extra_attributes");
            foreach ($extraAttributes as $areaId => $attributes) {
                $areasArray[$areaId]->extra_attributes = $attributes;
            }

            return $areasArray;
        } catch (\Illuminate\Database\QueryException $e) {
            echo "error getting areas";
            dd($e);
        }
    }

// TODO: the below bbox code should be changed to intersecting polygons
    // not crucial since no function passes in a non-null bbox anymore since
    // we do client side polygon intersections
    public function getAreasJSON($bbox = NULL) {
        $json = array();

        try {
            $query = "SELECT * from area";
            $preparedValues = NULL;
            if ($bbox) {
                $query = "SELECT * FROM area WHERE ST_Contains(ST_MakePolygon(ST_GeomFromText(:bbox, 4326)), ST_SetSRID(ST_MakePoint(area.longitude, area.latitude), 4326));";
                $preparedValues = ["bbox" => $bbox];
            }
            $areas = $this->getPermittedAreasWithQuery($query, $preparedValues);
            $plot_attributes = $this->getAttributesForAreas($areas, "plot_attributes");

            $json["areas"] = [];
            foreach ($areas as $area) {
                $unavco_name = $area->unavco_name;
                $project_name = $area->project_name;

                $currentArea = [];
                $currentArea["properties"]["unavco_name"] = $unavco_name;
                $currentArea["properties"]["project_name"] = $project_name;
                $currentArea["type"] = "Feature";
                $currentArea["geometry"]["type"] = "Point";
                $currentArea["geometry"]["coordinates"] = [floatval($area->longitude), floatval($area->latitude)];

                $currentArea["properties"]["num_chunks"] = $area->numchunks;
                $currentArea["properties"]["country"] = $area->country;
                $currentArea["properties"]["attributekeys"] = $this->arrayFormatter->postgresToPHPArray($area->attributekeys);
                $currentArea["properties"]["attributevalues"] = $this->arrayFormatter->postgresToPHPArray($area->attributevalues);
                $currentArea["properties"]["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($area->decimaldates);
                $currentArea["properties"]["string_dates"] = $this->arrayFormatter->postgresToPHPArray($area->stringdates);
                $currentArea["properties"]["region"] = $area->region;

                $bindings = [$area->id];

                if (isset($area->extra_attributes)) {
                    $currentArea["properties"]["extra_attributes"] = $area->extra_attributes;
                } else {
                    $currentArea["properties"]["extra_attributes"] = NULL;
                }

                if (isset($plot_attributes[$area->id])) {
                    $currentArea["properties"]["plot_attributes"] = $plot_attributes[$area->id]["plotAttributes"];
                } else {
                    $currentArea["properties"]["plot_attributes"] = NULL;
                }

                array_push($json["areas"], $currentArea);
            }

            return response()->json($json);
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
