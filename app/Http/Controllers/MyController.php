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
      $return = exec("/usr/bin/python /home/vagrant/code/Converter.py hi.h5 timeseries");

      if ($return) {
        throw new \Exception("KappaRoss" . $return);
      }

      $path = storage_path() . "/json";
      //dd($path);

      $fileName = $request->file('data')->getClientOriginalName();

      $request->file('data')->move(
        $path, $fileName
      );

      return view('map', ["fileName" => $fileName]);
    }

    public function returnPage() {

      $fileName = "";

      return view('map', ["fileName" => $fileName]);
    }

}
