<?php

namespace App\Http\Controllers;

class RequestFormatter {
    // list of mandatory parameters for webservice
    public $latitude = NULL;
    public $longitude = NULL;
    public $dataset = NULL;

    // list of optional parameters for webservice
    public $startTime = NULL;
    public $endTime = NULL;
    public $outputType = NULL;

    // return dictionary containing parameters and values
    public function getRequestParameters() {
        $requestParameters = array();
        $requestParameters["latitude"] = $this->latitude;
        $requestParameters["longitude"] = $this->longitude;
        $requestParameters["dataset"] = $this->dataset;
        $requestParameters["startTime"] = $this->startTime;
        $requestParameters["endTime"] = $this->endTime;
        $requestParameters["outputType"] = $this->outputType;

        return $requestParameters;
    }
}