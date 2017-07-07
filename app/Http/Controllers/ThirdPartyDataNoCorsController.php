<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\Input;

class ThirdPartyDataNoCorsController extends Controller {
	public function getUNR() {
		return file_get_contents("ftp://gneiss.nbmg.unr.edu/rapids/llh");
	}

	public function getMidas() {
		$json = [];
		$midas = file_get_contents("http://geodesy.unr.edu/velocities/midas.IGS08.txt");
		$stationLatLongs = $this->getUNR();
		$json["midas"] = $midas;
		$json["stationLatLongs"] = $stationLatLongs;

		return response()->json($json);
	}

	public function getIGEPNEarthquakeFeed() {
		return file_get_contents("http://www.igepn.edu.ec/portal/eventos/www/events.xml");
	}

	public function getHawaiiReloc() {
		return file_get_contents("http://www.rsmas.miami.edu/personal/glin/Hawaii_files/out.reloc_release");
	}

	public function getLongValleyReloc() {
		return file_get_contents("http://www.rsmas.miami.edu/users/glin/Long_Valley_files/out.reloc_LV_release");
	}

	public function getUSGSMonthlyFeed() {
		$jsonString = file_get_contents("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson");
		// can't use response()->json as it calls json_encode again but this is already a valid json encoded string
		return response()->make($jsonString, 200, [
					"Content-Type"=> "application/json"
				]);
	}

	public function getUSGSEventsEarthquake(Request $request) {
		$url = $request->all()["url"];
		$curlSession = curl_init();
	    curl_setopt($curlSession, CURLOPT_URL, urldecode($url));
	    curl_setopt($curlSession, CURLOPT_HEADER, true); 
	    curl_setopt($curlSession, CURLOPT_BINARYTRANSFER, true);
	    curl_setopt($curlSession, CURLOPT_RETURNTRANSFER, true);
	    curl_setopt($curlSession, CURLOPT_ENCODING, "gzip");
	    $data = curl_exec($curlSession);
	    $responseCode = curl_getinfo($curlSession, CURLINFO_HTTP_CODE);
	    $responseBody = NULL;
	    // get body and not headers
	    $responseBody = explode("\r\n\r\n", $data, 2)[1];
	    curl_close($curlSession);

		return response()->make($responseBody, $responseCode);
	}
}
