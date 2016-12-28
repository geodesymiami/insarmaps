<?php

namespace App\Http\Controllers;

use DateTime;

class DateFormatter 
{
    /**
    * Credits: http://stackoverflow.com/questions/19271381/correctly-determine-if-date-string-is-a-valid-date-in-that-format
    *
    * Given a string containing information on a date, check if string converts to valid date.
    * Currently this function supports two formats: (1) mm/dd/yyyy (2) yyyymmdd
    *
    * @param string $dateString - format is either mm/dd/yyyy (ex: 12/19/2010) or yyyymmdd 20101219
    * @return DateTime object if dateString contains valid date, NULL if invalid
    */
    public function verifyDate($dateString) {

      $date = DateTime::createFromFormat('m/d/Y', $dateString);
      print_r("about to print m/d/Y date");
      if ($date && $date->format('Y-m-d') === $date) {
        print_r("got a date in m/d/Y");
        return $date;
      }

      print_r("date was invalid");
      return NULL;
    }

  	/**
  	* Given a string containing information on a date, return decimal version of that date
  	*
  	* @param string $dateString - format is mm/dd/yyyy (ex: 12/19/2010)
  	* @return float - (ex: 2010.9671232877)
  	*/
  	public function dateToDecimal($dateString) {
  	  $date = DateTime::createFromFormat('m/d/Y', $dateString);
      return $date->format("Y") + ($this->getDaysElapsed($date)) / 365.0;
    }

    // given string date in yyyymmdd format, ex: 20101219
    // return decimal version of dateString, ex: 2007.9671232877
    // used for calculation of velocity in calcLinearRegressionLine
    public function dateStringsToDecimalArray($stringDates) {
      // $date = DateTime::createFromFormat('Ymd', $stringDates[0]);
      $decimalDates = [];

      $len = count($stringDates);
      for ($i = 0; $i < $len; $i++) {
        $year = substr($stringDates[$i], 0, 4);
        $month = substr($stringDates[$i], 4, 2);
        $day = substr($stringDates[$i], 6, 2);

        $date = new DateTime();
        $date->setDate($year, $month, $day);
        $decimal_date = $date->format("Y") + ($this->getDaysElapsed($date)) / 365.0;
        array_push($decimalDates, $decimal_date);
      }
     
      return $decimalDates;
    }

    // assume input date is in format of a PHP dateTime object with year Y,
    // return days elapsed from beginning of year Y up to input date
    public function getDaysElapsed($date) {
      $date2 = new DateTime();
      $date2->setDate($date->format("Y"), 1, 1);
      $interval = date_diff($date, $date2);

      return $interval->format("%a");
    }

    public function dateStringToUnixTimestamp($dateString) {
      $parsedDate = explode("/", $dateString);

      // php dateTime object requires format yyyy-mm-dd
      $date = new DateTime();
      $date->setDate($parsedDate[0], $parsedDate[1], $parsedDate[2]);
      
      return $date->getTimestamp();
    }

    public function stringDatesArrayToUnixTimeStampArray($stringDates) {
      $len = count($stringDates);
      $unixTimeStamps = [];

      for ($i = 0; $i < $len; $i++) {
        $year = substr($stringDates[$i], 0, 4);
        $month = substr($stringDates[$i], 4, 2);
        $day = substr($stringDates[$i], 6, 2);
        $dateString = $year . "/" . $month . "/" . $day;

        array_push($unixTimeStamps, $this->dateStringToUnixTimestamp($dateString));
      }

      return $unixTimeStamps;
    }

}