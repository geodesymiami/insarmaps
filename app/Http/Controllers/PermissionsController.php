<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use DateTime;
use DB;
use Illuminate\Support\Facades\Input;

class PermissionsController extends Controller {
	// get permissions by id
	public function getPermissions($tableName, $permissionsTableName, $joinConditions) {
		$sql = "SELECT * FROM " . $tableName . " INNER JOIN " . $permissionsTableName . " ON (" . $joinConditions[0];

		$numJoinConditions = count($joinConditions);

		for ($i = 1; $i < $numJoinConditions; $i++) {
			$sql = $sql . " AND " . $joinConditions[i];
		}

		$sql = $sql . ")";
		$permissions = DB::select($sql);		
		$permissionsDict = [];

		foreach ($permissions as $permission) {
			$curPermissionArea = $permission->area_name;
			$curPermission = $permission->permission;

			if (empty($permissionsDict[$curPermissionArea])) {
				$permissionsDict[$curPermissionArea] = [$curPermission];
			} else {
				array_push($permissionsDict[$curPermissionArea], $curPermission);
			}
		}

		return $permissionsDict;
	}

	public function getUserPermissions($userID, $tableName, $permissionsTableName, $joinConditions) {
		$sql = "SELECT * FROM " . $tableName . " INNER JOIN " . $permissionsTableName . " ON (" . $joinConditions[0];

		$numJoinConditions = count($joinConditions);

		for ($i = 1; $i < $numJoinConditions; $i++) {
			$sql = $sql . " AND " . $joinConditions[i];
		}

		$sql = $sql . ") WHERE " . $tableName . "." . "id=" . $userID;

		$permissions = DB::select($sql);		

		$userPermissions = [];

		foreach ($permissions as $permission) {
			$curPermission = $permission->permission;
			array_push($userPermissions, $curPermission);
		}

		return $userPermissions;
	}
}
