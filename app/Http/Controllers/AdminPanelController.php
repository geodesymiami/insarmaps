<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use Auth;

class AdminPanelController extends Controller
{
    public function __construct() {
        $this->middleware("checkAdmin");
    }

    public function getAdminPanel() {
    	$permissionController = new PermissionsController();

    	$userPermissions = $permissionController->getAllUserPermissions("users", "user_permissions");
    	
        return view("adminPanel", ["userPermissions" => $userPermissions]);
    }
}
