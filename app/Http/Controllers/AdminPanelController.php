<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;

class AdminPanelController extends Controller
{
    public function __construct() {
        $this->middleware("checkAdmin");
    }

    public function getAdminPanel() {
        return view("adminPanel");
    }
}
