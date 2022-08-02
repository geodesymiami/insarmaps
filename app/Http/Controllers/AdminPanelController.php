<?php

namespace App\Http\Controllers;

use DB;
use Illuminate\Http\Request;

class AdminPanelController extends Controller {
    public function __construct() {
        $this->middleware("checkAdmin");
    }

    public function getAdminPanel() {
        $permissionController = new PermissionsController();

        $userPermissions = $permissionController->getAllUserPermissions("users", "user_permissions");

        return view("adminPanel", ["userPermissions" => $userPermissions]);
    }

    public function postSetUserPermissions(Request $request) {
        $userID = $request->input("id"); // notice cast to int
        $newPermissions = $request->input("newPermissions");

        try {

            $sql = "DELETE FROM user_permissions WHERE user_id = ?";
            DB::delete($sql, [$userID]);

            $sql = "INSERT INTO user_permissions (user_id, permission) VALUES ";

            $permissionBindings = [];

            foreach ($newPermissions as $newPermission) {
                if ($newPermission != "") {
                    $sql = $sql . "(?, ?),";
                    array_push($permissionBindings, $userID);
                    array_push($permissionBindings, $newPermission);
                }
            }

            if (count($permissionBindings) == 0) {
                echo "Deleted all permissions except public";
                return;
            }
            $sql = rtrim($sql, ",");
            DB::insert($sql, $permissionBindings);
            echo "Success";
        } catch (\Illuminate\Database\QueryException $e) {
            echo "There was an error setting user permissions";
            echo $e;
        }
    }
}
