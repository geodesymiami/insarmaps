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

      $path = storage_path() . "\json";
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
