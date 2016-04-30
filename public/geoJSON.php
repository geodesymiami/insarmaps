<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
//phpinfo();
$filePath = "/home/vagrant/code/insar_map_mvc/public/json/geo_timeseries_masked.h5test_chunk_";

$file = isset($_GET["file"]) ? $_GET["file"] : "";
$point = isset($_GET["point"]) ? $_GET["point"] : "";

if ($file != "") {
	$file = $filePath . $file . ".json";
	$fileContents = file_get_contents($file);
	$json = json_decode($fileContents, true);

	$numFeatures = count($json["features"]);

// var_dump($json);

// add colors
	for ($i = 0; $i < $numFeatures; $i++) {
		$numDisplacements = count($json["features"][$i]["properties"]["displacement"]);
		$displacement = 0;
		$numPoints = 0;

		for ($j = 0; $j < $numDisplacements; $j++) {
			$displacement += $json["features"][$i]["properties"]["displacement"][$j];
			$numPoints++;
		}

		$displacement /= $numPoints;

	// decide color
		if ($displacement < -0.15682001908620198) {
			$json["features"][$i]["properties"]["marker-symbol"] = "redMarker";
		} else if ($displacement < 0.05441098411877951) {
			$json["features"][$i]["properties"]["marker-symbol"] = "yellowMarker";
		} else {
			$json["features"][$i]["properties"]["marker-symbol"] = "greenMarker";
		}
	}

// take out displacements for client
	for ($i = 0; $i < $numFeatures; $i++) {
		unset($json["features"][$i]["properties"]["displacement"]);
	}

	echo json_encode($json);
} else if ($point != "") {
	$jsonToReturn = array();

	$tokens = explode(":", $point);
	$fileNum = $tokens[0];
	$lat = $tokens[1];
	$long = $tokens[2];

	$file = $filePath . $fileNum . ".json";
	$fileContents = file_get_contents($file);
	$json = json_decode($fileContents, true);

	$numFeatures = count($json["features"]);
	$epsilon = 0.00000001; // floats are inherently inaccurate to compare, especially since the JSON has such accurate numbers
	$jsonToReturn["dates"] = $json["dates"];

	for ($i = 0; $i < $numFeatures; $i++) {
		$fileLat = $json["features"][$i]["geometry"]["coordinates"][0];
		$fileLong = $json["features"][$i]["geometry"]["coordinates"][1];

		if (abs($lat - $fileLat) < $epsilon && abs($long - $fileLong) < $epsilon) {
			$jsonToReturn["displacements"] = $json["features"][$i]["properties"]["displacement"];
			echo json_encode($jsonToReturn);
			break;
		}
	}
}
?>