<?php

namespace App\Http\Controllers;

class PostgresArrayFormatter {
    /**
     * Convert a PostgreSQL array wrapped in a string into a PHP array of strings
     *
     * @param string $pgArray - ex: "{2007.09589041,2007.6,2007.7260274,2007.85205479}"
     * @return array $phpArray - ex: ["2007.09589041","2007.6","2007.7260274","2007.85205479"]
     */
    public function postgresToPHPArray($pgArray) {

        $postgresString = trim($pgArray, "{}");
        $elements = explode(",", $postgresString);

        $phpArray = [];
        $arrayLen = count($elements);

        for ($i = 0; $i < $arrayLen; $i++) {
            $curString = $elements[$i];

            if (strpos($curString, "POLYGON") !== false) {
                $curString = substr($curString, 1);
                $curString = $curString . " " . $elements[$i + 1];
                $curString = $curString . " " . $elements[$i + 2];
                $curString = $curString . " " . $elements[$i + 3];
                $curString = substr($curString, 0, strlen($curString) - 1);

                $i += 3;
            }

            array_push($phpArray, $curString);
        }

        return $phpArray;
    }

    /**
     * Convert array of strings to an array of floats
     *
     * @param array $array - ex: ["2007.09589041","2007.6","2007.7260274","2007.85205479"]
     * @return array - ex: [2007.09589041,2007.6,2007.7260274,2007.85205479]
     */
    public function stringArrayToFloatArray($array) {
        return array_map("floatval", $array);
    }

    /**
     * Convert a PostgreSQL array wrapped in a string into an array of floats
     *
     * @param array $pgArray - ex: "{2007.09589041,2007.6,2007.7260274,2007.85205479}"
     * @return array - ex: [2007.09589041,2007.6,2007.7260274,2007.85205479]
     */
    public function postgresToPHPFloatArray($pgArray) {
        $stringArray = $this->postgresToPHPArray($pgArray);
        return $this->stringArrayToFloatArray($stringArray);
    }

    public function PHPToPostgresArrayString($array) {
        return "{" . join(",", $array) ."}";
    }
}
