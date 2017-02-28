<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;

class MyController extends Controller
{

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

  public function returnPage(Request $request) {
    $options = $request->all();

    return view('map', ["viewOptions" => $options]);
  }

    // creates a folder to store json and returns string of that folder path
  public function makeFolder(Request $request) {
    // get path where the Converter.py is stored in
    $fileName = $request->file('data')->getClientOriginalName();
    $folderName = chop($fileName,".h5");
    $jsonFolderPath = storage_path() . "/json/"/*"/var/www/html/insar_map_mvc/storage/json/"*/ . $folderName;
    $_SESSION['jsonFolderPath'] = $jsonFolderPath;

    // $dirname = $_POST["search"];
    // $filename = "/folder/" . $dirname . "/";
    if (!file_exists($jsonFolderPath)) {
      mkdir($jsonFolderPath, 0777);
    }
    return $jsonFolderPath;
  }

}
