<?php

namespace App\Http\Controllers;

use DB;

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
            $curPermissionArea = $permission->area_id;
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

        $sql = $sql . ") WHERE " . $tableName . "." . "id=?";
        $preparedValues = [$userID];
        $permissions = DB::select(DB::raw($sql), $preparedValues);

        $userPermissions = [];

        foreach ($permissions as $permission) {
            $curPermission = $permission->permission;
            array_push($userPermissions, $curPermission);
        }

        return $userPermissions;
    }

    public function getAllUserPermissions($userTableName, $permissionsTableName) {
        $sql = "SELECT id, name, email FROM " . $userTableName;
        $allUsers = DB::select($sql);
        $userWithPermissions = [];

        foreach ($allUsers as $user) {
            $permisisons = $this->getUserPermissions($user->id, $userTableName, $permissionsTableName, ["users.id = user_permissions.user_id"]);
            $userAndPermission = ["user" => $user, "permissions" => $permisisons];

            array_push($userWithPermissions, $userAndPermission);
        }

        return $userWithPermissions;
    }
}
