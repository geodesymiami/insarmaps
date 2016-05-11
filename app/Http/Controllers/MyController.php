<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;

class MyController extends Controller
{

    public function convertData(Request $request) {
      //dd($request->file('data')->getClientOriginalName());
      //dd($request);
      //dd(storage_path());
      $path = storage_path() . "/json";
      //dd($path);
      $fileName = $request->file('data')->getClientOriginalName();
      $this->makeFolder($request);

      $request->file('data')->move(
        $path, $fileName
      );

      $execString = "/usr/bin/python " . $path . "/Converter.py " . $path . "/" . $fileName . " timeseries";

      echo "gonna run converter <br>";
    //$return = exec($execString, $out);          
      echo "i shouldnt' have run converter, so you should see me fast<br>";

      return view('map', ["fileName" => $fileName]);
    }

    public function returnPage() {

      $fileName = "";

      return view('map', ["fileName" => $fileName]);
    }

    public function makeFolder(Request $request) {
      // get path where the Converter.py is stored in
      $fileName = $request->file('data')->getClientOriginalName();
      $folderName = chop($fileName,".h5");
      $jsonFolderPath = "/var/www/html/insar_map_mvc/storage/json/" . $folderName;
      print $jsonFolderPath;
      mkdir($jsonFolderPath, 0777);
    }

}
