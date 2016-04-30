<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
//phpinfo();

$file = $_GET["file"];

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
?>