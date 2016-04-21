<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;

class MyController extends Controller
{
    public function convertData(Request $request) {
      dd($request->data);
      //return view('frontend.packages.index', ["packages" => $packages]);
      return view('map');
    }

    public function returnData() {

    }
}
