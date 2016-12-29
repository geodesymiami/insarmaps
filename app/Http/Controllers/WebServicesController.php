<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DateTime;

use App\Http\Requests;
use DB;

// pChart library
use CpChart\Factory\Factory;
use Exception;

// TODO: make all these date functions into own class - it's weird that they are here. also format graph to look better.

class WebServicesController extends Controller
{
    public function __construct() {
      $this->arrayFormatter = new PostgresArrayFormatter();
      $this->dateFormatter = new DateFormatter();
      $this->requestFormatter = new RequestFormatter();
    }

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
      // debugging, remove when chart fully working
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

      // calculate velocity = slope of linear regression line 
      $decimalDates = $this->dateFormatter->dateStringsToDecimalArray($stringDates);
      $result = $this->calcLinearRegressionLine($decimalDates, $displacements);
      $json["subtitle"]["text"] = "velocity: " . round($result["m"] * 1000, 2) . " mm/yr";

      $jsonString = json_encode(($json));

      $tempPictName = tempnam(storage_path(), "pict");
      $command = "highcharts-export-server --instr '" . $jsonString . "' --outfile " . $tempPictName . " --type jpg";

      exec($command);
      $headers = ["Content-Type" => "image/jpg", "Content-Length" => filesize($tempPictName)];
      $response = response()->file($tempPictName, $headers)->deleteFileAfterSend(true);

      return $response;
    }

    // given a decimal format min and max date range, return indices of dates 
    // that best correspond to min and max from an array of valid decimal dates 
    public function getDateIndices($startTime, $endTime, $arrayOfDates) {
      $minIndex = 0;
      $maxIndex = 0;
      $currentDate = 0; 
      $minAndendTimeIndices = []; 
   
      for ($i = 0; $i < count($arrayOfDates); $i++) {
        $currentDate = $arrayOfDates[$i];
        if ($currentDate >= $startTime) {
          $minIndex = $i;
          break;
        }
      }

      for ($i = 0; $i < count($arrayOfDates); $i++) {
        $currentDate = $arrayOfDates[$i];
        if ($currentDate < $endTime) {
          $maxIndex = $i + 1;
        }
      }

      array_push($minAndendTimeIndices, $minIndex);
      array_push($minAndendTimeIndices, $maxIndex);

      return $minAndendTimeIndices;
    }  

    // given a request, check if it contains enough parameters

    // given a dataset name and point, returns json array containing
    // decimaldates, stringdates, and displacement values of that point
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
      $string_dates = $this->arrayFormatter->postgresToPHPFloatArray($string_dates);
      $displacements = $this->arrayFormatter->postgresToPHPFloatArray($displacements);

      // * Select dates that best match startTime and endTime - if not specified, startTime is first date
      // and endTime is last date in decimaldates and stringdates
      // * Currently we are not accounting for condition where user specifies a startTime but no endTime,
      // or a endTime but no startTime

      // * TODO: create a function to check if startTime and endTime inputted by user is valid
      // current condition of checking for -1 is insufficient placeholder
      if ($startTime !== NULL && $endTime !== NULL) {
        // convert startTime and endTime into decimal dates
        $startTime = $this->dateFormatter->dateToDecimal($startTime);
        $endTime = $this->dateFormatter->dateToDecimal($endTime);
        $minAndendTimeIndices = $this->getDateIndices($startTime, $endTime, $decimal_dates);
        $startTimeIndex = $minAndendTimeIndices[0];
        $endTimeIndex = $minAndendTimeIndices[1];
      } 
      else {  // otherwise we set startTime and endTime to default date array in specified dataset
        $startTimeIndex = 0;
        $endTimeIndex = count($decimal_dates);
      }

      // put dates and displacement into json, limited by range 
      // startTimeIndex to (endTimeIndex - startTimeIndex + 1)
      $json["decimal_dates"] = array_slice($decimal_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
      $json["string_dates"] = array_slice($string_dates, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));
      $json["displacements"] = array_slice($displacements, $startTimeIndex, ($endTimeIndex - $startTimeIndex + 1));

      return $json;
    }


    // main entry point into web services
    // * given a latitude, longitude, and dataset - return json array for stringdates, decimaldates,
    // and displacements of point that corresponds to input data or return null if data is invalid
    // * user also has option of sending a startTime and endTime to specify the range of dates they would
    // like to view data from - this range is by default set to the first and last date of the dataset
    // * user can also specify outputType, which should be json or plot - default value results in json,
    // if not specified or if specification is invalid, revert to default value
    public function processRequest(Request $request) {
      $json = [];
      $requests = $request->all();
      $len = count($requests);

      // we need latitude, longitude, dataset
      // optional request vaues are startTime, endTime, outPutType (either "json" or "plot")
      $latitude = 0.0;
      $longitude = 0.0;
      $dataset = "";
      $startTime = -1;
      $endTime = -1;
      $outputType = "json";

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

      // if outPutType was specified and its not json and its not plot, set to default json value
      if (strlen($outputType) > 0 && strcasecmp($outputType, "json") != 0 && strcasecmp($outputType, "plot") != 0) {
        $outputType = "json";
      }

      // check if startTime and endTime are valid, if not return json object with error message
      // webservice dates must follow SSARA format yyyy-mm-dd
      if ($this->dateFormatter->verifyDate($startTime) === NULL || $this->dateFormatter->verifyDate($endTime) === NULL) {
        $error["error"] = "invalid startTime or endTime - please input date in format yyyy-mm-dd (ex: 2010-12-19)";
        return json_encode($error);
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

      // if query fails for some reason, return json object with error message
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
      // in future we will come up with algorithm to get the closest point
      $json = $this->createJsonArray($dataset, $points[0], $startTime, $endTime);

      // by default we return json; only if outputType = plot, we return plot
      if (strcasecmp($outputType, "plot") == 0) {
        return $this->generatePlotPicture($json["displacements"], $json["string_dates"]);
      }
      else {
        return json_encode($json);
      }
    }


    // Thanks to Richard at: https://richardathome.wordpress.com/2006/01/25/a-php-linear-regression-function/
    /**
    * linear regression function
    * @param $x array x-coords
    * @param $y array y-coords
    * @returns array() m=>slope, b=>intercept
    */
    public static function calcLinearRegressionLine($x, $y) {
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


    public function renderView() {
      $requestParameters = $this->requestFormatter->getRequestParameters();

      return view("webServices", ["requestParameters" => $requestParameters]); // here i send the parameter dictionary
    }

}
