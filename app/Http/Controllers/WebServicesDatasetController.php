<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DateTime;

use App\Http\Requests;
use DB;


class WebServicesDatasetController extends Controller
{
    public function __construct() {
      $this->arrayFormatter = new PostgresArrayFormatter();
      $this->dateFormatter = new DateFormatter();
      $this->requestFormatter = new RequestFormatter();
    }	

    public function processRequest(Request $request) {
      $json = [];

      // all request parameters are optional
      $satellite = NULL;
      $relativeOrbit = 0;
      $firstFrame = 0;
      $mode = NULL;
      $flightDirection = NULL;

      // extract parameter values from Request url
      $requests = $request->all();

      // INITIAL TEST
      dd($requests);

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

    }

    /**
    * Return Laravel view object for webservice UI for querying datasets
    *
    * @return object $requestParameters - Laravel view object containing dictionary of query parameters
    */
    public function renderView() {
      // $requestParameters = $this->requestFormatter->getRequestParameters();

      return view("webServicesDataset");
    }
}