<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;

class WebServicesController extends Controller
{
    // main entry point into web services
    public function processRequest(Request $request) {
    	$requests = $request->all();

    	// iterate through every request, and do stuff based on it - your job zishi
    }
}
