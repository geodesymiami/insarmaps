<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DateTime;

use App\Http\Requests;
use DB;


class WebServicesBoxController extends Controller
{
    public function __construct() {
      $this->arrayFormatter = new PostgresArrayFormatter();
    }	

    public function processRequest(Request $request) {
      $json = [];

      // all request parameters are optional
      $latitude1 = 1000.0; 
      $longitude1 = 1000.0;
      $latitude2 = 1000.0; 
      $longitude2 = 1000.0;
      $latitude3 = 1000.0; 
      $longitude3 = 1000.0;
      $latitude4 = 1000.0; 
      $longitude4 = 1000.0;
      $bbox = null;

      // extract parameter values from Request url
      $requests = $request->all();
      // dd($requests);
      // TODO: ask zishi why he gets lat and long like this instead of just getting
      // the box. if it's just miscommunication, remove extraneous switch checks
      foreach ($requests as $key => $value) {
        switch ($key) {
          case 'latitude1':
            $latitude1 = $value;
            break;
          case 'latitude2':
            $latitude2 = $value;
            break;
          case 'latitude3':
            $latitude3 = $value;
            break;
          case 'latitude4':
            $latitude4 = $value;
            break;
          case 'longitude1':
            $longitude1 = $value;
            break;
          case 'longitude2':
            $longitude2 = $value;
            break;
          case 'longitude3':
            $longitude3 = $value;
            break;
          case 'longitude4':
            $longitude4 = $value;
            break;
          case 'box':
            $bbox = $value;
          default:
            break;
        }
      }

      // Example webservice url: http://homestead.app/WebServicesBox?longitude1=130.7685&latitude1=32.8655&longitude2=130.7685&latitude2=32.8665&longitude3=130.7695&latitude3=32.8665&longitude4=130.7695&latitude4=32.8655

      // QUERY 1: get names of all datasets
      $bbox = "'" . $bbox . "'";
      $controller = new GeoJSONController();

      return $controller->getAreas($bbox);
    }

    /**
    * Return Laravel view object for webservice UI for querying datasets
    *
    * @return object $requestParameters - Laravel view object containing dictionary of query parameters
    */
    public function renderView() {
      // $requestParameters = $this->requestFormatter->getRequestParameters();
      return view("webServicesBox");
    }
}