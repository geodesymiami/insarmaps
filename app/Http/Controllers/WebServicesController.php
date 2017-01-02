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
    * Given an array of dates, return indices of dates that are closest to startTime and endTime
    *
    * @param string $startTime - lower boundary of dates in yyyy-mm-dd format
    * @param string $endTime - upper boundary of dates in yyyy-mm-dd format
    * @param array $decimalDates - dates in decimal format
    * @return array $startAndEndTimeIndices - indices of dates closest to startTime and endTime
    */
    public function getDateIndices($startTime, $endTime, $decimalDates) {
      $minIndex = 0;
      $maxIndex = 0;
      $currentDate = 0; 
      $startAndEndTimeIndices = []; 
      

      for ($i = 0; $i < count($decimalDates); $i++) {
        $currentDate = $decimalDates[$i];
        if ($currentDate >= $startTime) {
          $minIndex = $i;
          break;
        }
      }

      for ($i = 0; $i < count($decimalDates); $i++) {
        $currentDate = $decimalDates[$i];
        if ($currentDate < $endTime) {
          $maxIndex = $i + 1;
        }
      }

      array_push($startAndEndTimeIndices, $minIndex);
      array_push($startAndEndTimeIndices, $maxIndex);

      return $startAndEndTimeIndices;
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

      // * Select dates that best match startTime and endTime - if not specified, startTime is first date
      // and endTime is last date in decimaldates and stringdates
      // * Currently we are not accounting for condition where user specifies a startTime but no endTime,
      // or a endTime but no startTime

      if ($startTime !== NULL && $endTime !== NULL) {
        // convert startTime and endTime into decimal dates
        $startTime = $this->dateFormatter->stringDateToDecimal($startTime);
        $endTime = $this->dateFormatter->stringDateToDecimal($endTime);
        $minAndendTimeIndices = $this->getDateIndices($startTime, $endTime, $decimal_dates);
        $startTimeIndex = $minAndendTimeIndices[0];
        $endTimeIndex = $minAndendTimeIndices[1];
      } 
      else {  // otherwise we set startTime and endTime to default date array in specified dataset
        $startTimeIndex = 0;
        $endTimeIndex = count($decimal_dates);
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

      // TODO: Change system for processRequest since user should not see json...set default value to plot?

      // Mandatory request parameters: latitude, longitude, dataset
      // Optional request parameters: startTime, endTime, outPutType
      $latitude = 0.0;
      $longitude = 0.0;
      $dataset = "";
      $startTime = NULL;  // if dataset is valid, default value will be set to first date in dataset
      $endTime = NULL;  // if dataset is valid, default value will be set to last date in dataset 
      $outputType = "json"; // default value is json

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

      // if outPutType was specified and its not json and its not plot, set to default json value
      if (strlen($outputType) > 0 && strcasecmp($outputType, "json") != 0 && strcasecmp($outputType, "plot") != 0) {
        $outputType = "json";
      }

      // TODO: check for condition where startTime is inputted by user but endTime is not
      // currently system only gets specific dates if startTime and endTime are BOTH specified

      // check if startTime and endTime were inputted by user
      // if so, check if they are in yyyy-mm-dd format, if not return json object with error message
      if ($startTime !== NULL && $endTime !== NULL) {
        if ($this->dateFormatter->verifyDate($startTime) === NULL || $this->dateFormatter->verifyDate($endTime) === NULL) {
          $error["error"] = "invalid startTime or endTime - please input date in format yyyy-mm-dd (ex: 2010-12-19)";
          return json_encode($error);
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
    * @return array() m=>slope, b=>intercept
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
