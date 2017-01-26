<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DateTime;

use App\Http\Requests;
use DB;

use CpChart\Factory\Factory;
use Exception;

// NOTE: We currently use 3 date formats between various dependencies in SQL, Highcharts, etc. 
// 1) yyyy-mm-dd / string (ex: 2010-12-20)
// 2) decimal (ex: 2010.97)
// 3) unix timestamp (ex: 1170692925)
// Hence whenever a parameter or return value is a date, specify format to avoid confusion

// Pipeline: WebServicesController.php gets parameters for query from RequestFormatter.php
// and sends that to webServices.blade.php which generates HTML and uses webservicesUI.js to 
// check if user input paramaters are valid and generate a webservice url

class WebServicesController extends Controller
{
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
        return json_encode($linearRegression);
      }

      $json["subtitle"]["text"] = "velocity: " . round($linearRegression["m"] * 1000, 2) . " mm/yr";

      $jsonString = json_encode(($json));

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
        $lastDate = $this->dateFormatter->verifyDate($string_dates[count($string_dates)-1]);
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
      }
      else if (count($points) > 1) {
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

    /**
    * Given a request object containing a url, return a json encoded array for data corresponding to point
    * that best matches request parameters specified by user. If more than one dataset contain this point, 
    * return data for all datasets. If no datasets contain point, return NULL.
    *
    * @param Request $request - url containing parameters specified by user to search for a point in a dataset
    * @return array $json - contains decimaldates, stringdates, and displacement of point
    */
    public function processRequest(Request $request) {
      $json = [];

      // Required request parameters: latitude, longitude
      $latitude = 0.0;
      $longitude = 0.0;
      $satellite = NULL;
      $relativeOrbit = NULL;
      $firstFrame = NULL;
      $mode = NULL;
      $flightDirection = NULL;
      $startTime = NULL;  // if specified, returned datasets must occur during or after this time
      $endTime = NULL;  // if specified, returned datasets must occur during or before this time
      $outputType = "json"; // default value is json, other option is plot
      $optionalSearch = FALSE; // if user specifies any optional parameter except outputType, set to true and adjust SQL

      // extract parameter values from Request url
      $requests = $request->all();
      foreach ($requests as $key => $value) {
        switch ($key) {
          case 'latitude':
            if (strlen($value) > 0) {
              $latitude = $value;
            }
            break;
          case 'longitude':
            if (strlen($value) > 0) {
              $longitude = $value;
            }
            break;
          case 'satellite':
            if (strlen($value) > 0) {
              $satellite = $value;
              $optionalSearch = TRUE;
            }
            break;
          case 'relativeOrbit':
            if (strlen($value) > 0) {
              $relativeOrbit = $value;
              $optionalSearch = TRUE;
            }
            break;
          case 'firstFrame':
            if (strlen($value) > 0) {
              $firstFrame = $value;
              $optionalSearch = TRUE;
            }
            break;
          case 'mode':
            if (strlen($value) > 0) {
              $mode = $value;
              $optionalSearch = TRUE;
            }
            break;
          case 'flightDirection':
            if (strlen($value) > 0) {
              $flightDirection = $value;
              $optionalSearch = TRUE;
            }
            break;
          case 'startTime':
            if (strlen($value) > 0) {
              $startTime = $value;
              // uncomment later when I get startTime filter working
              // $optionalSearch = TRUE;
            }
            break;
          case 'endTime':
            if (strlen($value) > 0) {
              $endTime = $value;
              // uncomment later when I get startTime filter working
              // $optionalSearch = TRUE;
            }
            break;
          case 'outputType':
            if (strlen($value) > 0) {
              $outputType = $value;
            }
            break;
          default:
            break;
        }
      }

      // check if startTime inputted by user is in in yyyy-mm-dd or yyyymmdd format
      if ($startTime !== NULL && $this->dateFormatter->verifyDate($startTime) === NULL) {
        $json["errors"] = "please input startTime in format yyyy-mm-dd (ex: 1990-12-19)";
        return json_encode($json);
      }

      // check if inputted by user is in in yyyy-mm-dd or yyyymmdd format
      if ($endTime !== NULL && $this->dateFormatter->verifyDate($endTime) === NULL) {
        $json["errors"] = "please input endTime in format yyyy-mm-dd (ex: 2020-12-19)";
        return json_encode($json);
      }

      // check if startTime is less than or equal to endTime
      if ($startTime !== NULL && $endTime !== NULL) {
        $startDate = $this->dateFormatter->verifyDate($startTime);
        $endDate = $this->dateFormatter->verifyDate($endTime);
        $interval = $startDate->diff($endDate);

        if ($interval->format("%a") > 0 && $startDate > $endDate) {
          $json["errors"] = "please make sure startTime is a date earlier than endTime";
          return json_encode($json);
        }
      }

      // QUERY 1A: get names of all datasets
      $query = "SELECT unavco_name FROM area;";
      $unavcoNames = DB::select(DB::raw($query));
      $datasets = [];
      $data = []; // array of point data from all datasets that match closest to user query 
      $queryConditions = []; // array of conditions to narrow query result based on webservice parameters

      // format SQL result into a php array
      foreach ($unavcoNames as $unavcoName) {
        array_push($datasets, $unavcoName->unavco_name);
      }


      // QUERY 1B: if user inputted optional parameters to search datasets with, then create new query that searches for dataset names based on paramater
      /*
      Example url: http://homestead.app/WebServices?longitude=130.970&latitude=32.287&mission=Alos&startTime=2009-02-06&endTime=2011-04-03&outputType=json
      */
      if ($optionalSearch) {
        $query = "SELECT unavco_name FROM area INNER JOIN (select t1" . ".area_id FROM ";

        if (isset($satellite) && strlen($satellite) > 0) {
          // (select * from extra_attributes where attributekey='mission' and attributevalue='Alos')
          array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='mission' AND attributevalue='" . $satellite . "')");
        }

        if (isset($mode) && strlen($mode) > 0) {
          array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='beam_mode' AND attributevalue='" . $mode . "')");
        }

        if (isset($relativeOrbit) && strlen($relativeOrbit) > 0) {
          array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='relative_orbit' AND attributevalue='" . $relativeOrbit . "')");
        }

        if (isset($firstFrame) && strlen($firstFrame) > 0) {
          array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='first_frame' AND attributevalue='" . $firstFrame . "')");
        }

        if (isset($flightDirection) && strlen($flightDirection) > 0) {
          array_push($queryConditions, "(SELECT * FROM extra_attributes WHERE attributekey='flight_direction' AND attributevalue='" . $flightDirection . "')");
        }

        if (count($queryConditions) == 1) {
          $query = $query . $queryConditions[0] . " t1";
        }
        else if (count($queryConditions) > 1) {
          $query = $query . $queryConditions[0] . " t1";
          $len_queryConditions = count($queryConditions);
          for ($i = 1; $i < $len_queryConditions; $i++) {
            $query = $query . " INNER JOIN " . $queryConditions[$i] . " t" . ($i+1) . " ON t" . $i . ".area_id = t" . ($i+1) . ".area_id";
          }
        }
        $query = $query . ") result ON area.id = result.area_id;";
        $unavcoNames = DB::select(DB::raw($query));
      }

      // calculate polygon encapsulating longitude and latitude specified by user
      // delta = range of error for latitude and longitude values, can be changed as needed
      $delta = 0.0005;
      $p1_lat = $latitude - $delta;
      $p1_long = $longitude - $delta;
      $p2_lat = $latitude + $delta;
      $p2_long = $longitude - $delta;
      $p3_lat = $latitude + $delta;
      $p3_long = $longitude + $delta;
      $p4_lat = $latitude - $delta;
      $p4_long = $longitude + $delta;
      $p5_lat = $latitude - $delta;
      $p5_long = $longitude - $delta;

      // QUERY 2: for each dataset name, if point exists in dataset then 
      // return data of first point returned by polygon created by (longitude, latitude) and delta
      $len = count($unavcoNames);
      for ($i = 0; $i < $len; $i++) {
        $query = " SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM " . $datasets[$i] . " WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING( " . $p1_long . " " . $p1_lat . ", " . $p2_long . " " . $p2_lat . ", " . $p3_long . " " . $p3_lat . ", " . $p4_long . " " . $p4_lat . ", " . $p5_long . " " . $p5_lat . ")', 4326)), wkb_geometry);";

        $points = DB::select(DB::raw($query));
        if (count($points) > 0) {
          $nearest = $this->getNearestPoint($latitude, $longitude, $points);
          $data[$datasets[$i]] = $nearest;
        }
      }

      foreach ($data as $key => $value) {
        // $key = dataset name, $value = point object data returned by SQL
        $jsonForPoint = $this->createJsonArray($key, $value, $startTime, $endTime);
        $json[$key] = $jsonForPoint;
      }

      // if user specified outputType to be dataset names instead of json, return dataset names
      if (strcasecmp($outputType, "dataset") == 0) {
        $datasets = [];
        foreach ($json as $key => $value) {
          array_push($datasets, $key);
        }
        return json_encode($datasets);
      }

      // TODO: check if error occured based on startTime and endTime; if so return json 
      // by default we return plot unless outputType = json (used for debugging)
      if (isset($json["errors"]) || strcasecmp($outputType, "json") == 0) {
        return json_encode($json);
      }

      // TODO: return plot of first dataset in json array - this will a take a backburner
      return $this->createPlotPicture($json["displacements"], $json["string_dates"]);
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
      $latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000)
    {
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
