<?php

namespace App\Http\Controllers;

use DateTime;

class DateFormatter 
{
    /**
    * Given a string containing a date, return DateTime object of string or NULL
    *
    * @param string $stringDate - must be one of two formats: (1) yyyy-mm-dd (2) yyyymmdd
    * @return DateTime if stringDate converts to a valid date, NULL otherwise
    */
    public function verifyDate($stringDate) {

      /** two cases of error:
      * 1) invalid date - example is yyyy-mm-dd = 2010-12-40, 40th day of December is nonexistent
      *    in this case warning_count = 1 and error_count = 0
      * 2) incomplete data - example is yyyymmdd = 201012, day is nonexistent
      *    in this case warning_count = 0 and error_count = 1
      */
      $date = DateTime::createFromFormat('Y-m-d', $stringDate);
      $errors = DateTime::getLastErrors();
      if ($errors['warning_count'] == 0 && $errors['error_count'] == 0) {
        return $date;
      }

      $date = DateTime::createFromFormat('Ymd', $stringDate);
      $errors = DateTime::getLastErrors();
      if ($errors['warning_count'] == 0 && $errors['error_count'] == 0) {
        return $date;
      }
     
      return NULL;
    }

  	/**
  	* Given a string containing a date, return decimal conversion of date or NULL
    * string must be one of two formats: (1) yyyy-mm-dd (2) yyyymmdd
    *
    * Example: "2010-12-19" or "20101219" converts to 2010.9671232877
  	*
  	* @param string $stringDate - must be one two formats: (1) yyyy-mm-dd (2) yyyymmdd
  	* @return double if stringDate converts to a valid date, NULL otherwise
  	*/
  	public function stringDateToDecimal($stringDate) {

  	  $date = $this->verifyDate($stringDate);
      if ($date === NULL) {
        return $date;
      }

      return $date->format("Y") + ($this->getDaysElapsed($date)) / 365.0;
    }

    /**
    * Given an array of string dates, return decimal conversion of that array
    * We assume each string date is a valid date in yyyymmdd format since array is queried from database
    *
    * Example: ["2010-12-19", "2020-12-19"] converts to [2010.9671232877, 2020.9671232877]
    *
    * @param string $stringDates - date strings in array must be one two formats: (1) yyyy-mm-dd (2) yyyymmdd
    * @return double if stringDate contains a valid date, NULL otherwise
    */
    public function stringDatesToDecimalArray($stringDates) {

      $decimalDates = [];
      $len = count($stringDates);

      for ($i = 0; $i < $len; $i++) {
        array_push($decimalDates, $this->stringDateToDecimal($stringDates[$i]));
      }
   
      return $decimalDates;
    }

    /**
    * Given a DateTime object with year Y, return number of days elapsed from 
    * beginning of year Y up to date specified by DateTime object
    * Example: DateTime(2010-12-19) returns "353"
    *
    * @param DateTime $date
    * @return string - number of days elapsed
    */
    public function getDaysElapsed($date) {

      $date2 = new DateTime();
      $date2->setDate($date->format("Y"), 1, 1);
      $interval = date_diff($date, $date2);

      return $interval->format("%a");
    }

    /**
    * Given a string containing a date, return UNIX timestamp conversion of date
    * We assume each string date is a valid date in yyyymmdd format since array is queried from database
    *
    * Example: "20070205" returns 1170708432
    *
    * @param string $stringDate
    * @return integer - UNIX timestamp of $stringDate
    */
    public function stringDateToUnixTimestamp($stringDate) {

      $date = $this->verifyDate($stringDate);
      return $date->getTimestamp();
    }

    /**
    * Given array of string dates, return array of UNIX timestamps converted from dates
    * We assume each string date is a valid date in yyyymmdd format since array is queried from database
    *
    * @param array $stringDates
    * @return array - UNIX timestamps
    */
    public function stringDatesArrayToUnixTimeStampArray($stringDates) {

      $unixTimeStamps = [];
      $len = count($stringDates);

      for ($i = 0; $i < $len; $i++) {
        array_push($unixTimeStamps, $this->stringDateToUnixTimestamp($stringDates[$i]));
      }

      return $unixTimeStamps;
    }

}