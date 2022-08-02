<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class WebServicesDatasetController extends Controller {
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
        $query = NULL;
        $queryParameters = "";

        // extract parameter values from Request url
        $requests = $request->all();
        foreach ($requests as $key => $value) {
            switch ($key) {
            case 'satellite':
                $satellite = $value;
                // dd(gettype($satellite));
                break;
            case 'relativeOrbit':
                $relativeOrbit = $value;
                // dd(gettype($relativeOrbit));
                break;
            case 'firstFrame':
                $firstFrame = $value;
                // dd(gettype($firstFrame));
                break;
            case 'mode':
                $mode = $value;
                // dd(gettype($mode));
                break;
            case 'flightDirection':
                $flightDirection = $value;
                // dd(gettype($flightDirection));
                // $queryParameters += strval($value) + ",";
                break;
            default:
                break;
            }
        }

        dd($requests);

        $queryParameters += "{"+$satellite+","+$relativeOrbit+","+$firstFrame+","+$mode+","+$flightDirection+"}";
        // INITIAL TEST
        dd($queryParameters);

        // NOTE: Hackish query is inaccurate if multiple keys contains same value
        // for example if relativeOrbit = 2000 and firstFrame = 2000, and user searches for firstFrame = 2000
        // then query will return all datasets with attributevalues containing the value 2000, regardless if
        // value was mapped to relativeOrbit or firstFrame

        // SELECT * FROM area where attributevalues @> '{Alos, 73}'::varchar[];

        // How to securely query
        // $query = "SELECT decimaldates, stringdates FROM area WHERE unavco_name like ?";
        // $dateInfos = DB::select($query, [$dataset]);

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