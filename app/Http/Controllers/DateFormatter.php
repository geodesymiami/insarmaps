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

      return $date->format("Y") + ($this->getDaysElapsedInYear($date)) / 365.0;
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
    public function stringDateArrayToDecimalArray($stringDates) {

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
    public function getDaysElapsedInYear($date) {

      $date2 = new DateTime();
      $date2->setDate($date->format("Y"), 1, 1);
      $interval = date_diff($date, $date2);

      return $interval->format("%a");
    }

    /**
    * Given a string containing a date, return UNIX timestamp conversion of date
    * We assume each string date is a VALID date in yyyymmdd format since array is queried from database
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
    * We assume each string date is a VALID date in yyyymmdd format since array is queried from database
    *
    * @param array $stringDates
    * @return array - UNIX timestamps
    */
    public function stringDateArrayToUnixTimestampArray($stringDates) {

      $unixTimeStamps = [];
      $len = count($stringDates);

      for ($i = 0; $i < $len; $i++) {
        array_push($unixTimeStamps, $this->stringDateToUnixTimestamp($stringDates[$i]));
      }

      return $unixTimeStamps;
    }

    /**
    * Given an array of dates, return indices of dates that are closest to startTime and endTime
    *
    * @param string $startTime - lower boundary of dates in yyyy-mm-dd format
    * @param string $endTime - upper boundary of dates in yyyy-mm-dd format
    * @param array $decimalDates - dates in decimal format
    * @return array $startAndEndTimeIndices - indices of dates closest to startTime and endTime
    */
    public function getDateIndices($startTime, $endTime, $decimalDates) {
      $minIndex = 0;
      $maxIndex = 0;
      $currentDate = 0; 
      $startAndEndTimeIndices = []; 

      for ($i = 0; $i < count($decimalDates); $i++) {
        $currentDate = $decimalDates[$i];
        if ($currentDate >= $startTime) {
          $minIndex = $i;
          break;
        }
      }

      for ($i = 0; $i < count($decimalDates); $i++) {
        $currentDate = $decimalDates[$i];
        if ($currentDate < $endTime) {
          $maxIndex = $i + 1;
        }
      }

      array_push($startAndEndTimeIndices, $minIndex);
      array_push($startAndEndTimeIndices, $maxIndex);

      return $startAndEndTimeIndices;
    }  

    /**
    * If user does not input startTime, return 0
    * If user inputs startTime that is later than all dates in stringDates, return NULL
    * Otherwise return index of date that is equal to or later than startTime and is closest to startTime
    *
    * @param string $startTime - lower boundary of dates in yyyy-mm-dd format
    * @param array $stringDates - dates in yyyymmdd format
    * @return $minDateIndex 
    */
    public function getStartTimeDateIndex($startTime, $stringDates) {

      if ($startTime === NULL || strlen($startTime) == 0) {
        return 0;
      }

      $minDateIndex = NULL;
      $currentDate = new DateTime();  
      $interval = NULL;

      // WebServicesController.php already checked that startTime is valid date
      $startDate = $this->verifyDate($startTime);

      for ($i = 0; $i < count($stringDates); $i++) {
        $currentDate = $this->verifyDate($stringDates[$i]);
        $interval = $startDate->diff($currentDate);

        // Time of DateTime object creation can cause two DateTimes with the same yyyy-mm-dd
        // to be evaluated as different - therefore check day interval
        if ($interval->format("%a") == 0 || $currentDate > $startDate) {
          $minDateIndex = $i;
          break;
        }
      }

      return $minDateIndex;
    }  

    /**
    * If user does not input endTime, return index of last date in stringDates
    * If user inputs endTime that is earlier than all dates in stringDates, return NULL
    * Otherwise return index of date that is equal to or before after endTime and is closest to startTime
    *
    * @param string $endTime - upper boundary of dates in yyyy-mm-dd format
    * @param array $stringDates - dates in yyyymmdd format
    * @return $maxDateIndex 
    */
    public function getEndTimeDateIndex($endTime, $stringDates) {

      if ($endTime === NULL || strlen($endTime) == 0) {
        return count($stringDates)-1;
      }

      $maxDateIndex = NULL;
      $currentDate = new DateTime();  
      $interval = NULL;

      // WebServicesController.php already checked that endTime is valid date
      $endDate = $this->verifyDate($endTime);

      for ($i = 0; $i < count($stringDates); $i++) {
        $currentDate = $this->verifyDate($stringDates[$i]);
        $interval = $endDate->diff($currentDate);

        // Time of DateTime object creation can cause two DateTimes with the same yyyy-mm-dd
        // to be evaluated as different - therefore check day interval
        if ($interval->format("%a") == 0 || $currentDate < $endDate) {
          $maxDateIndex = $i;
        }
      }

      return $maxDateIndex;
    }  

}