<?php

namespace App\Http\Controllers;

class PostgresArrayFormatter
{
    public function postgresToPHPArray($pgArray) {
		$postgresStr = trim($pgArray, "{}");
		$elmts = explode(",", $postgresStr);

		$arrayToReturn = [];
	 	$arrayLen = count($elmts);

		for ($i = 0; $i < $arrayLen; $i++) {
	    	$curString = $elmts[$i];      

	    	if (strpos($curString, "POLYGON") !== false) {
	  			$curString = substr($curString, 1);
	        	$curString = $curString . " " . $elmts[$i + 1];
	        	$curString = $curString . " " . $elmts[$i + 2];
	        	$curString = $curString . " " . $elmts[$i + 3];
	        	$curString = substr($curString, 0, strlen($curString) - 1);

	    		$i += 3;
	    	}

	    	array_push($arrayToReturn, $curString);
	    }

		return $arrayToReturn;
	}

	public function stringArrayToFloatArray($array) {    
		return array_map("floatval", $array);
	}

	public function postgresToPHPFloatArray($pgArray) {
		$stringArray = $this->postgresToPHPArray($pgArray);
		return $this->stringArrayToFloatArray($stringArray);
	}
}
