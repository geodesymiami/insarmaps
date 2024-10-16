<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class MyController extends Controller {

    // name of each chunk is folder_path/chunk_#
    public function convertData(Request $request) {
        $path = storage_path() . "/json";
        $fileName = $request->file('data')->getClientOriginalName();
        $folderPath = $this->makeFolder($request);

        $request->file('data')->move(
            $path, $fileName
        );

        $execString = "/usr/bin/python " . $path . "/Converter.py " . $path . "/" . $fileName . " timeseries " . $folderPath;

        $return = exec($execString, $out);
        return view('map', ["fileName" => $fileName]);
    }

    private function getStartingURLOptions(Request $request, $lat = 30.0, $long = 0.0, $zoom = 0.0) {
        $allOptions = [];
        $startingView = [];
        $startingView["lat"] = $lat;
        $startingView["lng"] = $long;
        $startingView["zoom"] = $zoom;
        $allOptions["startingView"] = $startingView;
        $options = $request->all();
        $allOptions["startingDatasetOptions"] = $options;

        return $allOptions;
    }

    public function returnPage(Request $request, $lat = 30.0, $long = 0.0, $zoom = 1.6) {
        $allOptions = $this->getStartingURLOptions($request, $lat, $long, $zoom);

        return view('map', ["urlOptions" => $allOptions]);
    }

    public function renderVolcanoes(Request $request, $lat = 0.0, $long = 0.0) {
        $controller = new WebServicesController();
        $json = [];
        $options = new WebServicesOptions();
        $options->latitude = $lat;
        $options->longitude = $long;

        $areas = $controller->getAreasFromAttributes($options);

        $datasets = [];

        foreach ($areas as $areaID => $area) {
            if (isset($datasets[$area->extra_attributes["mission"]])) {
                array_push($datasets[$area->extra_attributes["mission"]], $area->unavco_name);
            } else {
                $datasets[$area->extra_attributes["mission"]] = [$area->unavco_name];
            }
        }

        $allOptions = $this->getStartingURLOptions($request, $lat, $long, 10.0);
        $allOptions["startingDatasetOptions"]["flyToDatasetCenter"] = "false";

        return view("volcanoes", ["datasets" => $datasets, "lat" => $lat, "long" => $long, "urlOptions" => $allOptions]);
    }

    // creates a folder to store json and returns string of that folder path
    public function makeFolder(Request $request) {
        // get path where the Converter.py is stored in
        $fileName = $request->file('data')->getClientOriginalName();
        $folderName = chop($fileName, ".h5");
        $jsonFolderPath = storage_path() . "/json/" /*"/var/www/html/insar_map_mvc/storage/json/"*/ . $folderName;
        $_SESSION['jsonFolderPath'] = $jsonFolderPath;

        // $dirname = $_POST["search"];
        // $filename = "/folder/" . $dirname . "/";
        if (!file_exists($jsonFolderPath)) {
            mkdir($jsonFolderPath, 0777);
        }
        return $jsonFolderPath;
    }

}
