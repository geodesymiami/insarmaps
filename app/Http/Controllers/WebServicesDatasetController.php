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
          case 'satellite':
            $satellite = $value;
            break;
          case 'relativeOrbit':
            $relativeOrbit = $value;
            break;
          case 'firstFrame':
            $firstFrame = $value;
            break;
          case 'mode':
            $mode = $value;
            break;
          case 'flightDirection':
            $flightDirection = $value;
            break;
          default:
            break;
        }
      }

      // TODO: current problem is that it is very difficult to check attributekeys and attributevalues using SQL
      // Wondering if checking user input against dataset attributes logic should be done in server instead of database
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