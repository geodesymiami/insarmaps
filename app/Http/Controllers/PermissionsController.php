<?php

namespace App\Http\Controllers;

use DB;

class PermissionsController extends Controller {
    public function getQueryForFindingPermittedAreas($userID) {
        $sql = "(SELECT area.id FROM area WHERE NOT EXISTS (SELECT area_id FROM area_allowed_permissions WHERE area_id = area.id) OR EXISTS (SELECT area_id FROM area_allowed_permissions WHERE area_id = area.id AND permission='public'))";
        $preparedValues = [];
        if ($userID) {
            $sql .= " OR EXISTS (SELECT permission FROM user_permissions WHERE user_id = ? AND permission IN (SELECT permission FROM area_allowed_permissions WHERE area_id = area.id))";
            array_push($preparedValues, $userID);
        }

        $sql .= ";";

        return ["sql" => $sql, "preparedValues" => $preparedValues];
    }

    public function getAndQueryForFindingPermittedAreas($userID) {
        $query = $this->getQueryForFindingPermittedAreas($userID);
        $sql = rtrim($query["sql"], ";");
        $sql = "AND (area.id IN " . $sql . ");";
        $query["sql"] = $sql;

        return $query;
    }
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
