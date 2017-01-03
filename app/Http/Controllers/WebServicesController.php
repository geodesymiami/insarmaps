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
    * @param array $stringDates - doubles representing dates in yyyy-mm-dd.0 format (ex: 20070808.0)
    * @param array $displacements - double representing ground displacement in meters/year
    * @return array $data - contains 2 arrays: $displacements and an array of unix dates
    */
    // INCONSISTENCY: we call param $stringDates but it is an array of doubles... 
    private function getDisplacementChartData($displacements, $stringDates) {

      $data = [];
      $len = count($stringDates);
      $unixDates = $this->dateFormatter->stringDatesArrayToUnixTimeStampArray($stringDates);

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
    private function generatePlotPicture($displacements, $stringDates) {
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
              "month": "%e. %b",
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
      $decimalDates = $this->dateFormatter->stringDatesToDecimalArray($stringDates);

      $result = $this->calcLinearRegressionLine($decimalDates, $displacements);

      // check if result of linear regression calculation produced an error
      if (gettype($result) == "string") {
        return json_encode($result);
      }

      $json["subtitle"]["text"] = "velocity: " . round($result["m"] * 1000, 2) . " mm/yr";

      $jsonString = json_encode(($json));

      $tempPictName = tempnam(storage_path(), "pict");
      $command = "highcharts-export-server --instr '" . $jsonString . "' --outfile " . $tempPictName . " --type jpg";

      exec($command);
      $headers = ["Content-Type" => "image/jpg", "Content-Length" => filesize($tempPictName)];
      $response = response()->file($tempPictName, $headers)->deleteFileAfterSend(true);

      return $response;
    }

    /**
    * Given a dataset name, point, returns json array containing data for a point within bounded time period
    *
    * @param string $dataset - name of dataset
    * @param string $point - point in dataset that user searched for using webservice
    * @param string $startTime - lower boundary of dates in yyyy-mm-dd format
    * @param string $endTime - upper boundary of dates in yyyy-mm-dd format
    * @return array $json - contains decimaldates, stringdates, and displacement of point
    */
    public function createJsonArray($dataset, $point, $startTime, $endTime) {
      $json = [];
      $decimal_dates = NULL;
      $string_dates = NULL;
      $displacements = $point->d;

      $startTimeIndex = NULL;
      $endTimeIndex = NULL;
      $minAndendTimeIndices = NULL;

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

      // if startTime or endTime go beyond range of dates, throw error message
      if ($startTimeIndex === NULL) {
        $lastDate = $this->dateFormatter->verifyDate($string_dates[count($string_dates)-1]);
        $error["error"] = "please input startTime earlier than or equal to " . $lastDate->format('Y-m-d');
        return ($error);
      }

      if ($endTimeIndex === NULL) {
        $firstDate = $this->dateFormatter->verifyDate($string_dates[0]);
        $error["error"] = "please input endTime later than or equal to " . $firstDate->format('Y-m-d');
        return ($error);
      }

      // put dates and displacement into json, bounded from startTime to endTime indices
      $json["decimal_dates"] = array_slice($decimal_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
      $json["string_dates"] = array_slice($string_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
      $json["displacements"] = array_slice($displacements, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));

      return $json;
    }

    /**
    * Given a request object containing a url, return a json encoded array for data corresponding to point
    * that best matches request parameters specified by user. Return null if parameters are invalid.
    *
    * @param Request $request - url containing parameters specified by user to search for a point in a dataset
    * @return array $json - contains decimaldates, stringdates, and displacement of point
    */
    public function processRequest(Request $request) {
      $json = [];

      // Mandatory request parameters: latitude, longitude, dataset
      // Optional request parameters: startTime, endTime, outPutType
      $latitude = 0.0;
      $longitude = 0.0;
      $dataset = "";
      $startTime = NULL;  // if dataset is valid, default value will be set to first date in dataset
      $endTime = NULL;  // if dataset is valid, default value will be set to last date in dataset 
      $outputType = "plot"; // default value is plot, json is used for debugging and checking values

      // extract parameter values from Request url
      $requests = $request->all();
      foreach ($requests as $key => $value) {
        switch ($key) {
          case 'latitude':
            $latitude = $value;
            break;
          case 'longitude':
            $longitude = $value;
            break;
          case 'dataset':
            $dataset = $value;
            break;
          case 'startTime':
            $startTime = $value;
            break;
          case 'endTime':
            $endTime = $value;
            break;
          case 'outputType':
            $outputType = $value;
            break;
          default:
            break;
        }
      }

      // check if startTime and endTime inputted by user are in in yyyy-mm-dd or yyyymmdd format
      if ($startTime !== NULL && $this->dateFormatter->verifyDate($startTime) === NULL) {
        $error["error"] = "please input startTime in format yyyy-mm-dd (ex: 1990-12-19)";
      }

      if ($endTime !== NULL && $this->dateFormatter->verifyDate($endTime) === NULL) {
        $error["error"] = "please input endTime in format yyyy-mm-dd (ex: 2020-12-19)";
      }

      // check if startTime is less than or equal to endTime
      if ($startTime !== NULL && $endTime !== NULL) {
        $startDate = $this->dateFormatter->verifyDate($startTime);
        $endDate = $this->dateFormatter->verifyDate($endTime);

        // check for case where startTime = "" and endTime = ""
        if ($startDate === NULL || $endDate == NULL) {
          $error["error"] = "invalid entry for startTime or endTime, please enter dates in yyyy-mm-dd format";
          return json_encode($error);
        }
        $interval = $startDate->diff($endDate);

        if ($interval->format("%a") > 0 && $startDate > $endDate) {
          $error["error"] = "please make sure startTime is a date earlier than endTime";
        }
      }

      // perform query to get point objects within +/- delta range of (longitude, latitude)
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

      $query = " SELECT p, d, ST_X(wkb_geometry), ST_Y(wkb_geometry) FROM " . $dataset . "
            WHERE st_contains(ST_MakePolygon(ST_GeomFromText('LINESTRING( " . $p1_long . " " . $p1_lat . ", " . $p2_long . " " . $p2_lat . ", " . $p3_long . " " . $p3_lat . ", " . $p4_long . " " . $p4_lat . ", " . $p5_long . " " . $p5_lat . ")', 4326)), wkb_geometry);";

      // if query fails, return json object with error message
      try {
        $points = DB::select(DB::raw($query));
      }
      catch (Exception $e) {
        $error["error"] = "invalid dataset name - please check dataset";
        return json_encode($error);
      }

      if (count($points) == 0) {
        $error["error"] = "point was not found - please check latitude and longitude";
        return json_encode($error);
      }

      // * Currently we hardcode by picking the first point in the $points array
      // TODO: Come up with algorithm to get the closest point
      $json = $this->createJsonArray($dataset, $points[0], $startTime, $endTime);

      // $json may contain error message string based on startTime and endTime, if so return message
      // by default we return plot unless outputType = json (used for debugging)
      if (isset($json["error"]) || strcasecmp($outputType, "json") == 0) {
        return json_encode($json);
      }

      return $this->generatePlotPicture($json["displacements"], $json["string_dates"]);
    }


    // Thanks to Richard at: https://richardathome.wordpress.com/2006/01/25/a-php-linear-regression-function/
    /**
    * linear regression function
    * @param $x array x-coords
    * @param $y array y-coords
    * @return array() m=>slope, b=>intercept
    */
    public static function calcLinearRegressionLine($x, $y) {
      // calculate number points
      $n = count($x);

      // special case: zero or one values in $x, throw exception message
      if ($n < 2) {
        $error = "Time interval contained 0 or 1 date and could not make linear regression line - please enter a later endTime or earlier startTime";
        return $error;
      }

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

    /**
    * Return Laravel view object for webservice UI
    *
    * @return object $requestParameters - Laravel view object containing dictionary of webservice parameters
    */
    public function renderView() {
      $requestParameters = $this->requestFormatter->getRequestParameters();

      return view("webServices", ["requestParameters" => $requestParameters]);
    }
}
