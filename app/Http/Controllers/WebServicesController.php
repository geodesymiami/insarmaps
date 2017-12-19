<?php

namespace App\Http\Controllers;

use DB;
use Excel;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Input;

// why didn't i just use a dictionary? php is dynamic and can dictionaries from anyType => anyType...
class WebServicesOptions {
    private $dateFormatter = NULL;
    public $latitude = 1000.0;
    public $longitude = 1000.0;
    public $satellite = NULL;
    public $relativeOrbit = NULL;
    public $firstFrame = NULL;
    public $mode = NULL;
    public $flightDirection = NULL;
    public $startTime = NULL; // if specified, returned datasets must occur during or after this time
    public $endTime = NULL; // if specified, returned datasets must occur during or before this time
    public $box = NULL; // string containing wkt geometry to get datasets bounded in a box
    public $downsampleFactor = 1;
    public $outputType = "json"; // default value is json, other option is dataset
    public $attributeSearch = FALSE; // if user specifies any search parameter except latitude, longitude, or outputType, set to true and adjust SQL
    public $datasetUnavcoName = NULL; // if user wants to find specific dataset
    public $pointID = NULL; // if user wants a specific point within a dataset
    public $volcanoID = NULL;

    public function __construct() {
        $this->dateFormatter = new DateFormatter();
    }

    public function checkForErrors() {
        $errors = [];
        // check if startTime inputted by user is in in yyyy-mm-dd or yyyymmdd format
        if ($this->startTime !== NULL && $this->dateFormatter->verifyDate($this->startTime) === NULL) {
            array_push($errors, "please input startTime in format yyyy-mm-dd (ex: 1990-12-19)");
        }
        // check if inputted by user is in in yyyy-mm-dd or yyyymmdd format
        if ($this->endTime !== NULL && $this->dateFormatter->verifyDate($this->endTime) === NULL) {
            array_push($errors, "please input endTime in format yyyy-mm-dd (ex: 2020-12-19)");
        }

        // check if startTime is less than or equal to endTime
        if ($this->startTime !== NULL && $this->endTime !== NULL) {
            $startDate = $this->dateFormatter->verifyDate($this->startTime);
            $endDate = $this->dateFormatter->verifyDate($this->endTime);

            if ($startDate && $endDate) {
                $interval = $startDate->diff($endDate);

                if ($interval->format("%a") > 0 && $startDate > $endDate) {
                    array_push($errors, "please make sure startTime is a date earlier than endTime");
                }
            } else {
                if (!$startDate) {
                    array_push($errors, "startDate isn't a valid date");
                }
                if (!$endDate) {
                    array_push($errors, "endDate isn't a valid date");
                }
            }
        }

        // check volcanoID is a number
        if ($this->volcanoID && !is_numeric($this->volcanoID)) {
            array_push($errors, "volcanoID must be a valid integer");
        } else {
            $this->volcanoID = (int) $this->volcanoID;
        }
        return $errors;
    }
}

// NOTE: We currently use 3 date formats between various dependencies in SQL, Highcharts, etc.
// 1) yyyy-mm-dd / string (ex: 2010-12-20)
// 2) decimal (ex: 2010.97)
// 3) unix timestamp (ex: 1170692925)
// Hence whenever a parameter or return value is a date, specify format to avoid confusion

// Pipeline: WebServicesController.php gets parameters for query from RequestFormatter.php
// and sends that to webServices.blade.php which generates HTML and uses webservicesUI.js to
// check if user input paramaters are valid and generate a webservice url

class WebServicesController extends Controller {
    private static $MBTILES_PATH = "/var/www/html/tileserver";

    public function __construct() {
        $this->arrayFormatter = new PostgresArrayFormatter();
        $this->dateFormatter = new DateFormatter();
        $this->requestFormatter = new RequestFormatter();
    }

    /**
     * Return array containing x and y axis data to create ploy using Highcharts.js library
     *
     * @param array $stringDates - strings representing VALID dates in yyyymmdd (ex: 20070808)
     * @param array $displacements - doubles representing ground displacement in meters/year
     * @return array $data - contains 2 arrays: $displacements and an array of unix dates
     */
    private function getDisplacementChartData($displacements, $stringDates) {

        $data = [];
        $len = count($stringDates);
        $unixDates = $this->dateFormatter->stringDateArrayToUnixTimestampArray($stringDates);

        for ($i = 0; $i < $len; $i++) {
            // high charts wants milliseconds so multiply by 1000
            array_push($data, [$unixDates[$i] * 1000, $displacements[$i]]);
        }

        return $data;
    }

    /**
     * Return Highcharts plot with x-axis = displacement and y-axis = date
     *
     * @param array $stringDates - strings representing dates in yyyy-mm-dd.0 format (ex: 20070808.0)
     * @param array $displacements - doubles representing ground displacement in meters/year
     * @return object $response - Highcharts plot object
     */
    private function createPlotPicture($displacements, $stringDates) {
        $jsonString = '{
        "title": {
          "text": null
        },
          "subtitle": {
            "text": "velocity: "
          },
          "navigator": {
            "enabled": true
          },
          "scrollbar": {
            "liveRedraw": false
          },
          "xAxis": {
            "type": "datetime",
            "dateTimeLabelFormats": {
              "month": "%b %Y",
              "year": "%Y"
            },
            "title": {
              "text": "Date"
            }
          },
          "yAxis": {
            "title": {
              "text": "Ground Displacement (cm)"
            },
            "legend": {
              "layout": "vertical",
              "align": "left",
              "verticalAlign": "top",
              "x": 100,
              "y": 70,
              "floating": true,
              "backgroundColor": "#FFFFFF",
              "borderWidth": 1
            },
            "plotLines": [{
              "value": 0,
              "width": 1,
              "color": "#808080"
            }]
          },
          "tooltip": {
            "headerFormat": "",
            "pointFormat": "{point.x:%e. %b %Y}: {point.y:.6f} cm"
          },
          "series": [{
            "type": "scatter",
            "name": "Displacement",
            "data": [],
            "marker": {
              "enabled": true
            },
            "showInLegend": false
          }],
          "chart": {
            "marginRight": 50
          }
      }';

        // pass true to get associative array instead of std class object
        $json = json_decode($jsonString, true);

        // debugging, remove when chart is fully working
        switch (json_last_error()) {
        case JSON_ERROR_NONE:
            break;
        case JSON_ERROR_DEPTH:
            echo ' - Maximum stack depth exceeded';
            break;
        case JSON_ERROR_STATE_MISMATCH:
            echo ' - Underflow or the modes mismatch';
            break;
        case JSON_ERROR_CTRL_CHAR:
            echo ' - Unexpected control character found';
            break;
        case JSON_ERROR_SYNTAX:
            echo ' - Syntax error, malformed JSON';
            break;
        case JSON_ERROR_UTF8:
            echo ' - Malformed UTF-8 characters, possibly incorrectly encoded';
            break;
        default:
            echo ' - Unknown error';
            break;
        }

        $json["series"][0]["data"] = $this->getDisplacementChartData($displacements, $stringDates);

        // calculate slope of linear regression line
        $decimalDates = $this->dateFormatter->stringDateArrayToDecimalArray($stringDates);

        $linearRegression = $this->calcLinearRegressionLine($decimalDates, $displacements);

        // check if linear regression calculation produced an error; if so return error
        if (isset($linearRegression["errors"])) {
            return response()->json($linearRegression);
        }

        $json["subtitle"]["text"] = "velocity: " . round($linearRegression["m"] * 1000, 2) . " mm/yr";

        $jsonString = response()->json(($json));

        $tempPictName = tempnam(storage_path(), "pict");
        $command = "highcharts-export-server --instr '" . $jsonString . "' --outfile " . $tempPictName . " --type jpg";

        exec($command);
        $headers = ["Content-Type" => "image/jpg", "Content-Length" => filesize($tempPictName)];
        $response = response()->file($tempPictName, $headers)->deleteFileAfterSend(true);

        return $response;
    }

    /**
     * Given a VALID dataset name and VALID point that exists in dataset,
     * return json array containing data for that point within bounded time period or error message
     *
     * @param string $dataset - name of dataset
     * @param string $point - point in dataset that user searched for using webservice
     * @param string $startTime - lower boundary of dates in yyyy-mm-dd format
     * @param string $endTime - upper boundary of dates in yyyy-mm-dd format
     * @return array $json - if no error, contains decimaldates, stringdates, and displacement of point
     */
    public function createJsonArray($dataset, $point, $startTime, $endTime) {
        $json = [];
        $decimal_dates = NULL;
        $string_dates = NULL;
        $displacements = $point->d;

        $startTimeIndex = NULL;
        $endTimeIndex = NULL;
        $minAndendTimeIndices = NULL;

        // how to get attributes for dataset instead of point
        // $query = "SELECT attributekeys, attributevalues FROM area WHERE unavco_name like ?";
        $query = "SELECT decimaldates, stringdates FROM area WHERE unavco_name like ?";
        $dateInfos = DB::select($query, [$dataset]);

        foreach ($dateInfos as $dateInfo) {
            $decimal_dates = $dateInfo->decimaldates;
            $string_dates = $dateInfo->stringdates;
        }

        // convert SQL data from string to array format
        $decimal_dates = $this->arrayFormatter->postgresToPHPFloatArray($decimal_dates);
        $string_dates = $this->arrayFormatter->postgresToPHPArray($string_dates);
        $displacements = $this->arrayFormatter->postgresToPHPFloatArray($displacements);

        // get index of dates that best match boundary of startTime and endTime
        $startTimeIndex = $this->dateFormatter->getStartTimeDateIndex($startTime, $string_dates);
        $endTimeIndex = $this->dateFormatter->getEndTimeDateIndex($endTime, $string_dates);

        // if startTime or endTime go beyond range of dates, create error message in json
        if ($startTimeIndex === NULL) {
            $lastDate = $this->dateFormatter->verifyDate($string_dates[count($string_dates) - 1]);
            $json["errors"] = "please input startTime earlier than or equal to " . $lastDate->format('Y-m-d');
        }

        if ($endTimeIndex === NULL) {
            $firstDate = $this->dateFormatter->verifyDate($string_dates[0]);
            $json["errors"] = "please input endTime later than or equal to " . $firstDate->format('Y-m-d');
        }

        // if no errors, put dates and displacement into json, bounded from startTime to endTime indices
        if (empty($json["errors"])) {
            $json["decimal_dates"] = array_slice($decimal_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
            $json["string_dates"] = array_slice($string_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
            $json["displacements"] = array_slice($displacements, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
        }

        return $json;
    }

    /**
     * Given an array of points, return point closest to user specified (longitude, latitude)
     *
     * @param float $latitude
     * @param float $longitude
     * @param array $points - list of points around the (longitude, latitude)
     * @return array - point object array containing displacements, latitude, longitude, and pid
     */
    public function getNearestPoint($latitude, $longitude, $points) {

        $numPoints = count($points);
        $nearest = $points[0];

        if ($numPoints == 1) {
            return $nearest;
        } else if (count($points) > 1) {
            $nearestDistance = $this->haversineGreatCircleDistance($latitude, $longitude, $nearest->st_y, $nearest->st_x);

            for ($j = 1; $j < $numPoints; $j++) {
                $currentDistance = $this->haversineGreatCircleDistance($latitude, $longitude, $points[$j]->st_y, $points[$j]->st_x);

                if ($currentDistance < $nearestDistance) {
                    $nearest = $points[$j];
                    $nearestDistance = $currentDistance;
                }
            }
        }

        return $nearest;
    }

    // convert csv array to csv string
    public function areasToCSV($areas) {
        $csv_string = "";
        foreach ($areas as $areaID => $area) {
            $csv_string .= $area->unavco_name . ",";
            $extraAttributes = $area->extra_attributes;
            foreach ($extraAttributes as $key => $value) {
                $csv_string .= $value . ",";
            }
            $csv_string[strlen($csv_string) - 1] = "\n";
        }
        return $csv_string;
    }

    /**
     * Given a request object containing a url, return a json encoded array for data corresponding to point
     * that best matches request parameters specified by user. If more than one dataset contain this point,
     * return data for all datasets. If no datasets contain point, return NULL.
     *
     * @param Request $request - url containing parameters specified by user to search for a point in a dataset
     * @return array $json - contains decimaldates, stringdates, and displacement of point
     */
    private function getOptions(Request $request) {
        $requests = $request->all();

        if (count($requests) == 0) {
            return NULL;
        }
        $options = new WebServicesOptions();
        foreach ($requests as $key => $value) {
            switch ($key) {
            case 'latitude':
                if (strlen($value) > 0) {
                    $options->latitude = $value;
                }
                break;
            case 'longitude':
                if (strlen($value) > 0) {
                    $options->longitude = $value;
                }
                break;
            case 'satellite':
                if (strlen($value) > 0) {
                    $options->satellite = $value;
                    $options->attributeSearch = TRUE;
                }
                break;
            case 'relativeOrbit':
                if (strlen($value) > 0) {
                    $options->relativeOrbit = $value;
                    $options->attributeSearch = TRUE;
                }
                break;
            case 'firstFrame':
                if (strlen($value) > 0) {
                    $options->firstFrame = $value;
                    $options->attributeSearch = TRUE;
                }
                break;
            case 'mode':
                if (strlen($value) > 0) {
                    $options->mode = $value;
                    $options->attributeSearch = TRUE;
                }
                break;
            case 'flightDirection':
                if (strlen($value) > 0) {
                    $options->flightDirection = $value;
                    $options->attributeSearch = TRUE;
                }
                break;
            case 'startTime':
                if (strlen($value) > 0) {
                    $options->startTime = $value;
                }
                break;
            case 'endTime':
                if (strlen($value) > 0) {
                    $options->endTime = $value;
                }
                break;
            case 'box':
                if (strlen($value) > 0) {
                    $options->box = $value;
                }
                break;
            case 'outputType':
                if (strlen($value) > 0) {
                    $options->outputType = $value;
                }
                break;
            case 'dataset':
                if (strlen($value) > 0) {
                    $options->datasetUnavcoName = $value;
                }
                break;
            case 'point':
                if (strlen($value) > 0) {
                    $options->pointID = $value;
                }
                break;
            case 'downsampleFactor':
                if (strlen($value) > 0) {
                    $options->downsampleFactor = $value;
                }
                break;
            case 'volcanoID':
                if (strlen($value) > 0) {
                    $options->volcanoID = $value;
                }
            default:
                break;
            }
        }

        return $options;
    }

    private function getAreasFromAttributes($attributes) {
        $queryConditions = [];
        $controller = new GeoJSONController();
        $query = "SELECT id, unavco_name FROM area INNER JOIN (select t1" . ".area_id FROM ";
        $preparedValues = [];

        if (isset($attributes->satellite) && strlen($attributes->satellite) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='mission' AND attributevalue=?)");
            array_push($preparedValues, $attributes->satellite);
        }

        if (isset($attributes->mode) && strlen($attributes->mode) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='beam_mode' AND attributevalue=?)");
            array_push($preparedValues, $attributes->mode);
        }

        if (isset($attributes->relativeOrbit) && strlen($attributes->relativeOrbit) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='relative_orbit' AND attributevalue=?)");
            array_push($preparedValues, $attributes->relativeOrbit);
        }

        if (isset($attributes->firstFrame) && strlen($attributes->firstFrame) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='first_frame' AND attributevalue=?)");
            array_push($preparedValues, $attributes->firstFrame);
        }

        if (isset($attributes->flightDirection) && strlen($attributes->flightDirection) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='flight_direction' AND attributevalue=?)");
            array_push($preparedValues, $attributes->flightDirection);
        }

        if (isset($attributes->startTime) && strlen($attributes->startTime) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='first_date' AND attributevalue::date >= ?::date)");
            array_push($preparedValues, $attributes->startTime);
        }

        if (isset($attributes->endTime) && strlen($attributes->endTime) > 0) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='last_date' AND attributevalue::date <= ?::date)");
            array_push($preparedValues, $attributes->endTime);
        }

        // QUERY 2A: if user inputted bounding box option, check which datasets have points in the bounding box
        if ($attributes->box) {
            array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='scene_footprint' AND ST_Intersects(ST_MakePolygon(ST_GeomFromText(?, 4326)), ST_GeomFromText(attributevalue, 4326)))");

            array_push($preparedValues, $attributes->box);
        }

        if (count($queryConditions) == 1) {
            $query = $query . $queryConditions[0] . " t1";
        } else if (count($queryConditions) > 1) {
            $query = $query . $queryConditions[0] . " t1";
            $len_queryConditions = count($queryConditions);
            for ($i = 1; $i < $len_queryConditions; $i++) {
                $query = $query . " INNER JOIN " . $queryConditions[$i] . " t" . ($i + 1) . " ON t" . $i . ".area_id = t" . ($i + 1) . ".area_id";
            }
        }
        $query = $query . ") result ON area.id = result.area_id;";

        $areas = $controller->getPermittedAreasWithQuery($query, NULL, $preparedValues);

        return $areas;
    }

    private function latLongToSmallWKTPolygonLineString($lat, $long) {
        // calculate polygon encapsulating longitude and latitude specified by user
        // delta = range of error for latitude and longitude values, can be changed as needed
        $delta = 0.0005;
        $p1_lat = $lat - $delta;
        $p1_long = $long - $delta;
        $p2_lat = $lat + $delta;
        $p2_long = $long - $delta;
        $p3_lat = $lat + $delta;
        $p3_long = $long + $delta;
        $p4_lat = $lat - $delta;
        $p4_long = $long + $delta;
        $p5_lat = $lat - $delta;
        $p5_long = $long - $delta;

        return "LINESTRING( " . $p1_long . " " . $p1_lat . ", " . $p2_long . " " . $p2_lat . ", " . $p3_long . " " . $p3_lat . ", " . $p4_long . " " . $p4_lat . ", " . $p5_long . " " . $p5_lat . ")";
    }

    private function getIndividualPointsFromAttributes($attributes) {
        // QUERY 2B: otherwise for each dataset name, if point exists in dataset then
        // return data of first point returned by polygon created by (longitude, latitude) and delta
        // key = area id, value = dataset name
        $controller = new GeoJSONController();
        // can be made faster by doing one query
        $areas = $controller->getPermittedAreasWithQuery("SELECT * FROM area");
        $query = "";
        $preparedValues = [];
        $areasMap = [];
        foreach ($areas as $areaID => $area) {
            $areasMap[$area->unavco_name] = $area;
            // can also do a select from area like so: (SELECT (SELECT unavco_name FROM area WHERE unavco_name='" . $area->unavco_name . "') as unavco_name, p ..., etc. But, why go to area table if we have unavco_name already from previous query, so let's insert it by simple php concatenation
            $query .= "(SELECT CAST ((SELECT '" . $area->unavco_name . "') as varchar) AS unavco_name, p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM \"" . $area->unavco_name . "\" WHERE st_contains(ST_MakePolygon(ST_GeomFromText(?, 4326)), wkb_geometry)) UNION ";
            $lineString = $this->latLongToSmallWKTPolygonLineString($attributes->latitude, $attributes->longitude);
            array_push($preparedValues, $lineString);
        }

        // take out last union ( and add )
        $query = substr($query, 0, strlen($query) - 7);
        $query[strlen($query) - 1] = ')';

        $points = DB::select(DB::raw($query), $preparedValues);

        $groupedPoints = [];
        // gather all points grouped by datasets
        foreach ($points as $point) {
            if (!isset($groupedPoints[$point->unavco_name])) {
                $groupedPoints[$point->unavco_name] = [$point];
            } else {
                array_push($groupedPoints[$point->unavco_name], $point);
            }
        }

        // if user specified outputType to be dataset names instead of json, return dataset names of the points found and their attributes
        if (strcasecmp($attributes->outputType, "dataset") == 0 || strcasecmp($attributes->outputType, "csv") == 0) {
            $csvArray = [];
            foreach ($areas as $areaID => $area) {
                // if we have a point from that area, append to csvArray
                if (isset($groupedPoints[$area->unavco_name])) {
                    array_push($csvArray, $area);
                }
            }

            // caller will know what to do with this
            return $csvArray;
        }

        // now get the nearest point to URL long and lat
        $json = [];
        $startDate = $attributes->startTime;
        $endDate = $attributes->endTime;
        foreach ($groupedPoints as $unavco_name => $points) {
            if (count($points) > 0) {
                $point = $this->getNearestPoint($attributes->latitude, $attributes->longitude, $points);
                $stringDates = $this->arrayFormatter->postgresToPHPArray($areasMap[$unavco_name]->stringdates);
                $decimalDates = $this->arrayFormatter->postgresToPHPFloatArray($areasMap[$unavco_name]->decimaldates);
                $point->string_dates = $stringDates;
                $point->decimal_dates = $decimalDates;
                $point->d = $this->arrayFormatter->postgresToPHPFloatArray($point->d);
                if ($startDate || $endDate) {
                    $json[$unavco_name] = $this->constrainPointToDates($startDate, $endDate, $point);
                } else {
                    $json[$unavco_name] = $point;
                }
            }
        }

        // otherwise, return json - caller will know what to do
        return $json;
    }

    private function constrainPointToDates($startDate, $endDate, $point) {
        $decimalsArray = $this->dateFormatter->stringDateArrayToDecimalArray($point->string_dates);
        $startDecimal = $this->dateFormatter->stringDateToDecimal($startDate);
        $endDecimal = $this->dateFormatter->stringDateToDecimal($endDate);
        $minMaxIndeces = $this->dateFormatter->getDateIndices($startDecimal, $endDecimal, $decimalsArray);
        $length = $minMaxIndeces[1] - $minMaxIndeces[0];

        $point->d = array_slice($point->d, $minMaxIndeces[0], $length);
        $point->decimal_dates = array_slice($point->decimal_dates, $minMaxIndeces[0], $length);
        $point->string_dates = array_slice($point->string_dates, $minMaxIndeces[0], $length);

        return $point;
    }

    private function findPointInDataset($datasetName, $lat, $long) {
        // make sure we have that datasetName in our available datasets. this seems like it can be refactored since it seems repeated among the methods
        $controller = new GeoJSONController();
        // can be made faster by doing one query
        $areas = $controller->getPermittedAreasWithQuery("SELECT * FROM area");

        $point = NULL;
        foreach ($areas as $areaID => $area) {
            if ($area->unavco_name === $datasetName) {
                $query = 'SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM "' . $datasetName . '" WHERE st_contains(ST_MakePolygon(ST_GeomFromText(?, 4326)), wkb_geometry)';

                $lineString = $this->latLongToSmallWKTPolygonLineString($lat, $long);
                $preparedValues = [$lineString];
                $dbPoints = NULL;
                try {
                    $dbPoints = DB::select($query, $preparedValues);
                } catch (\Illuminate\Database\QueryException $e) {
                    return NULL;
                }

                if ($dbPoints) {
                    $dbPoint = $this->getNearestPoint($lat, $long, $dbPoints);
                    $point = $controller->dbPointToJSON($dbPoint, $area->decimaldates, $area->stringdates);
                }
                break;
            }
        }

        return $point;
    }

    private function getPointsInBbox($datasetName, $lineStringBbox, $downsampleFactor) {
        // the below areas thing really needs refactoring...
        // make sure we have that datasetName in our available datasets. this seems like it can be refactored since it seems repeated among the methods
        $controller = new GeoJSONController();
        // can be made faster by doing one query
        $areas = $controller->getPermittedAreasWithQuery("SELECT * FROM area");
        $points = [];
        $MAX_POINTS = 155;
        foreach ($areas as $areaID => $area) {
            if ($area->unavco_name === $datasetName) {
                $query = 'SELECT COUNT(*) FROM "' . $datasetName . '" WHERE st_contains(ST_MakePolygon(ST_GeomFromText(?, 4326)), wkb_geometry) AND p % ? = 0';
                $preparedValues = [$lineStringBbox, $downsampleFactor];

                $numPoints = $MAX_POINTS;
                try {
                    $numPointsStdClassArray = DB::select($query, $preparedValues);
                    foreach ($numPointsStdClassArray as $countObj) {
                        $numPoints = $countObj->count;
                    }
                } catch (\Illuminate\Database\QueryException $e) {
                    return NULL;
                }

                if ($numPoints < $MAX_POINTS) {
                    $query = 'SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM "' . $datasetName . '" WHERE st_contains(ST_MakePolygon(ST_GeomFromText(?, 4326)), wkb_geometry) AND p % ? = 0';
                    $dbPoints = NULL;
                    try {
                        $dbPoints = DB::select($query, $preparedValues);
                    } catch (\Illuminate\Database\QueryException $e) {
                        dd($e);
                        return NULL;
                    }

                    $points["dates"]["decimal_dates"] = $this->arrayFormatter->postgresToPHPFloatArray($area->decimaldates);
                    $points["dates"]["string_dates"] = $this->arrayFormatter->postgresToPHPArray($area->stringdates);
                    $points["points"] = [];

                    $controller = new GeoJSONController();
                    foreach ($dbPoints as $point) {
                        array_push($points["points"], $controller->dbPointToJSON($point, NULL, NULL));
                    }
                } else {
                    $points["error"] = "Too many points, increase down sampling or decrease bounding area";
                }
            }
        }

        return $points;
    }

    public function processRequest(Request $request) {
        $json = [];
        // Required request parameters: latitude, longitude
        // default value for latitude and longitude is 1000.0 (impossible value)
        // extract parameter values from Request url
        $options = $this->getOptions($request);
        if (!$options) {
            return view("map", ["urlOptions" => NULL]);
        }
        $errors = $options->checkForErrors();
        if (count($errors) > 0) {
            $json["errors"] = $errors;
            return response()->json($json);
        }

        if ($options->volcanoID) {
            Excel::load(storage_path() . '/GVP_Volcano_List.xlsx', function ($reader) use ($options) {
                $array = $reader->toArray();

                $volcanoInformation = binary_search($array, $options->volcanoID, function ($row1, $id) {
                    return (int) ($id - $row1["volcano_number"]);
                });

                // TODO: call him and ask what we do here...
                if ($volcanoInformation) {
                }
            });
            return;
        }

        $returnValues = NULL;
        if ($options->datasetUnavcoName) {
            // search for point within dataset, otherwise search for info on dataset
            $controller = new GeoJSONController();
            // pointID specified
            if ($options->pointID) {
                return $controller->getDataForPoint($options->datasetUnavcoName, $options->pointID);
            }
            // bounding box specified
            // return all points in a box, possibly down sampled.
            if ($options->box) {
                return $this->getPointsInBbox($options->datasetUnavcoName, $options->box, $options->downsampleFactor);
            }

            // lat and long specified
            if ($options->longitude != 1000.0 && $options->longitude != 1000.0) {
                return $this->findPointInDataset($options->datasetUnavcoName, $options->latitude, $options->longitude);
            }
            // otherwise, get this area's info
            $returnValues = $controller->getPermittedAreasWithQuery("SELECT * FROM area", ["area.unavco_name LIKE ?"], [$options->datasetUnavcoName]);

        } else if ((strcasecmp($options->outputType, "dataset") == 0) && !$options->attributeSearch && $options->longitude == 1000.0 && $options->latitude == 1000.0) {
            // if user only specifies dataset and no other attribute, return all dataset names;
            $controller = new GeoJSONController();
            $returnValues = $controller->getPermittedAreasWithQuery("SELECT * FROM area");
        } else if ($options->attributeSearch) {
            // QUERY 1C: if user inputted optional parameters to search datasets with, then create new query that searches for dataset names based on paramater
            /*
            Example url: http://homestead.app/WebServices?longitude=130.970&latitude=32.287&mission=Alos&startTime=2009-02-06&endTime=2011-04-03&outputType=json

            Another url: http://homestead.app/WebServices?longitude=130.970&latitude=32.287&box=LINESTRING(130.9695%2032.2865,%20130.9695%2032.2875,%20130.9705%2032.2875,%20130.9705%2032.2865,%20130.9695%2032.2865)&mission=Alos&mode=SM&startTime=2009-02-06&endTime=2011-04-03&outputType=dataset
             */
            $returnValues = $this->getAreasFromAttributes($options);
        } else {
            // otherwise, return individual points
            $returnValues = $this->getIndividualPointsFromAttributes($options);
        }

        if ($returnValues === NULL) {
            return response()->json(["An error has occurred"]);
        }

        if (strcasecmp($options->outputType, "json") == 0) {
            $json = [];
            foreach ($returnValues as $areaID => $area) {
                $json[$area->unavco_name] = $area;
            }
            return response()->json($json);
        }

        if (strcasecmp($options->outputType, "dataset") == 0 || strcasecmp($options->outputType, "csv") == 0) {
            $csv_string = $this->areasToCSV($returnValues);
            return response()->make($csv_string, 200);
        }

        // otherwise not recognized outputType;
        $errors = ["Invalid outputType"];
        return response()->json($errors);
    }

    // Thanks to Richard at: https://richardathome.wordpress.com/2006/01/25/a-php-linear-regression-function/
    /**
     * linear regression function
     * @param $x array x-coords
     * @param $y array y-coords
     * @return array() m=>slope, b=>intercept
     */
    public static function calcLinearRegressionLine($x, $y) {

        $json = [];

        // calculate number points
        $n = count($x);

        // special case: zero or one values in $x, throw exception message
        if ($n < 2) {
            $json["errors"] = "time interval contained 0 or 1 date and could not make linear regression line - please enter a later endTime or earlier startTime";
            return $json;
        }

        // ensure both arrays of points are the same size
        if ($n != count($y)) {
            $json["errors"] = "linear_regression(): Number of elements in coordinate arrays do not match";
            return $json;
        }

        // calculate sums
        $x_sum = array_sum($x);
        $y_sum = array_sum($y);

        $xx_sum = 0;
        $xy_sum = 0;

        for ($i = 0; $i < $n; $i++) {
            $xy_sum += ($x[$i] * $y[$i]);
            $xx_sum += ($x[$i] * $x[$i]);
        }

        // calculate slope
        $m = (($n * $xy_sum) - ($x_sum * $y_sum)) / (($n * $xx_sum) - ($x_sum * $x_sum));

        // calculate intercept
        $b = ($y_sum - ($m * $x_sum)) / $n;

        // return result
        return array("m" => $m, "b" => $b);
    }

    /**
     * Calculates the great-circle distance between two points, with
     * the Haversine formula.
     * @param float $latitudeFrom Latitude of start point in [deg decimal]
     * @param float $longitudeFrom Longitude of start point in [deg decimal]
     * @param float $latitudeTo Latitude of target point in [deg decimal]
     * @param float $longitudeTo Longitude of target point in [deg decimal]
     * @param float $earthRadius Mean earth radius in [m]
     * @return float Distance between points in [m] (same as earthRadius)
     */
    function haversineGreatCircleDistance(
        $latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000) {
        // convert from degrees to radians
        $latFrom = deg2rad($latitudeFrom);
        $lonFrom = deg2rad($longitudeFrom);
        $latTo = deg2rad($latitudeTo);
        $lonTo = deg2rad($longitudeTo);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) + cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
        return $angle * $earthRadius;
    }

    public function uploadMbtiles(Request $request) {
        $file = $request->file("file");
        $fileName = $file->getClientOriginalName();
        try {
            $file->move(self::$MBTILES_PATH, $fileName);
        } catch (Exception $e) {
            return response("Error storing file", 500);
        }

        return response("Successfully stored file", 200);
    }

    public function deleteMbtiles(Request $request) {
        $fileName = self::$MBTILES_PATH . "/" . Input::get("fileName");
        $res = 0;

        try {
            $res = unlink($fileName);
        } catch (Exception $e) {
            return response("Error deleting file", 500);
        }

        if (!$res) {
            return response("Error deleting file", 500);
        }

        return response("Successfully deleted file", 200);
    }

    /**
     * Return Laravel view object for webservice UI for querying points
     *
     * @return object $requestParameters - Laravel view object containing dictionary of query parameters
     */
    public function renderView() {
        // return view("webServices", ["requestParameters" => $requestParameters]);
        return view("webServices");
    }
}
